import { db } from "@/configs/firebaseConfig";
import { imagekit } from "@/lib/imagekit";
import { replicate } from "@/lib/replicate";
import { doc, updateDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { imageUrl, imageToVideoPromot, uid, docId } = await req.json();

    const input = {
        image: imageUrl,
        prompt: imageToVideoPromot
    };

    await updateDoc(doc(db, 'user-ads', docId), {
        imageToVideoStatus: 'pending',
    })

    const output = await replicate.run("wan-video/wan-2.2-i2v-fast", { input });



    //@ts-ignore
    console.log(output.url());


    //Save to Imagekit
    //@ts-ignore
    const resp = await fetch(output.url());
    const videoBuffer = Buffer.from(await resp.arrayBuffer());

    const uploadResult = await imagekit.upload({
        file: videoBuffer,
        fileName: `video_${Date.now()}.mp4`,
        isPublished: true
    })

    await updateDoc(doc(db, 'user-ads', docId), {
        imageToVideoStatus: 'completed',
        videoUrl: uploadResult.url
    })

    //Update User Credits



    //@ts-ignore
    return NextResponse.json(uploadResult.url);
    //Save Video to Cloud
}