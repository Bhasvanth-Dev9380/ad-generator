import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { GoogleGenAI } from "@google/genai";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// PROMPT is a constant string defining the prompt for generating a product showcase image.
const PROMPT = `Create a vibrant product showcase image featuring a uploaded image
in the center, surrounded by dynamic splashes of liquid or relevant material that complement the product.
 Use a clean, colorful background to make the product stand out. Include subtle elements related to the product's flavor,
  ingredients, or theme floating around to add context and visual interest. 
  Ensure the product is sharp and in focus, with motion and energy conveyed through the splash effects ,
 Also give me image to video prompt for same in JSON format: {textToImage:'',imageToVideo:''}. Do not add any raw text or comment, Just give Json
`

// AVATAR_PROMPT is a constant string defining the prompt for generating a product showcase image with an avatar.
const AVATAR_PROMPT = `Create a professional product showcase image 
featuring the uploaded avatar naturally holding
 the uploaded product image in their hands. Make 
 the product the clear focal point of the scene. 
 Use a clean, colorful background that highlights the product.
  Include subtle floating elements related to the product’s flavor, 
  ingredients, or theme for added context, if relevant. Ensure both the avatar and product are sharp, well-lit, and in focus, 
conveying a polished and professional look.Also give me image to video prompt for same 
   in JSON format: {textToImage:'',imageToVideo:''} Do not add any raw text or comment, Just give Json`


// --- robust URL -> inlineData
async function urlToInlineData(url: string) {
  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    throw new Error(`Failed to fetch image. Status ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength < 20) {
    throw new Error("Fetched image is empty or too small.");
  }

  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let mimeType = res.headers.get("content-type") || "";
  if (!mimeType.startsWith("image/")) {
    const lower = url.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (lower.endsWith(".webp")) mimeType = "image/webp";
    else if (lower.endsWith(".gif")) mimeType = "image/gif";
    else mimeType = "image/png";
  }

  return { inlineData: { data: base64, mimeType } };
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in model output");
    return JSON.parse(match[0]);
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const description = formData.get("description");
  const size = formData?.get("size");
  const userEmail = formData?.get("userEmail");
  const avatar = formData?.get("avatar") as string;
  const imageUrl = formData?.get("imageUrl") as string;

  const userRef = collection(db, "users");
  const q = query(userRef, where("email", "==", userEmail));
  const querySnapshot = await getDocs(q);
  const userDoc = querySnapshot.docs[0];
  const userInfo = userDoc.data();

  const docId = Date.now().toString();
  await setDoc(doc(db, "user-ads", docId), {
    userEmail,
    status: "pending",
    description,
    size,
    docId,
  });

  try {
    let imageKitRef: any;
    let productImageUrl = imageUrl;

    // We'll also keep the ORIGINAL uploaded base64 (most reliable for Gemini)
    let uploadedBase64: string | null = null;
    let uploadedMime: string = "image/png";

    if (!imageUrl) {
      const arrayBuffer = await file.arrayBuffer();
      uploadedBase64 = Buffer.from(arrayBuffer).toString("base64");
      uploadedMime = file.type || "image/png";

      imageKitRef = await imagekit.upload({
        file: uploadedBase64,
        fileName: Date.now() + ".png",
        isPublished: true,
      });

      productImageUrl = imageKitRef.url;
    }

    // ---------------------------
    // STEP 1: JSON creation
    // Use uploadedBase64 directly if available, otherwise fetch URL
    // ---------------------------
    const jsonPrompt = avatar?.length > 2 ? AVATAR_PROMPT : PROMPT;

    const productPart = uploadedBase64
      ? { inlineData: { data: uploadedBase64, mimeType: uploadedMime } }
      : await urlToInlineData(productImageUrl!);

    const jsonResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: jsonPrompt },
            productPart,
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            textToImage: { type: "string" },
            imageToVideo: { type: "string" },
          },
          required: ["textToImage", "imageToVideo"],
        },
      },
    });

    let textOutput = jsonResponse.text?.trim() || "";
    textOutput = textOutput.replace("```json", "").replace("```", "").trim();
    const json = extractJson(textOutput);

    console.log("JSON", json);

    // ---------------------------
    // STEP 2: Image generation
    // ---------------------------
    const partsForImage: any[] = [
      { text: json?.textToImage },
      productPart, // reuse the exact valid product image bytes
    ];

    if (avatar?.length > 2) {
      partsForImage.push(await urlToInlineData(avatar));
    }

    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: partsForImage }],
    });

    const candidates = imageResponse.candidates || [];
    const contentParts = candidates[0]?.content?.parts || [];
    const inlineImagePart = contentParts.find((p: any) => p.inlineData?.data);

    if (!inlineImagePart) {
      throw new Error("No image returned from Gemini");
    }

    const generatedImage = inlineImagePart.inlineData.data;

    const uploadResult = await imagekit.upload({
      file: `data:image/png;base64,${generatedImage}`,
      fileName: `generate-${Date.now()}.png`,
      isPublished: true,
    });

    await updateDoc(doc(db, "user-ads", docId), {
      finalProductImageUrl: uploadResult.url,
      productImageUrl: productImageUrl,
      status: "completed",
      imageToVideoPrompt: json.imageToVideo,
    });

    return NextResponse.json(uploadResult.url);
  } catch (e) {
    await deleteDoc(doc(db, "user-ads", docId));
    console.log(e);
    return NextResponse.json({ error: "Please Try Again" });
  }
}
