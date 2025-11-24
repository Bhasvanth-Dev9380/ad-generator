"use client" // This directive marks the component for client-side rendering. It's necessary because this component uses hooks like useState and useEffect, and interacts with the browser's DOM (e.g., via the useRouter hook and axios).

import React, { useEffect, useState } from 'react'
import FormInput from '../_components/FormInput'
import PreviewResult from '../_components/PreviewResult'
import axios from 'axios'
import { useAuthContext } from '@/app/provider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Defines the structure for the form data, including an optional file, a description, size, and image URLs.
type FormData = {
    file?: File | undefined,
    description: string,
    size: string,
    imageUrl?: string,
    avatar?: string
}

function ProductImages({ title, enableAvatar }: any) {

    // State to hold the form's data.
    const [formData, setFormData] = useState<FormData>();
    // State to manage the loading status during the API call.
    const [loading, setLoading] = useState(false);
    // Retrieves user information from the authentication context.
    const { user } = useAuthContext();
    // Hook to handle client-side navigation.
    const router = useRouter();

    // Effect to check for user authentication on component mount. If no user is found, it redirects to the login page.
    useEffect(() => {
        if (!user) {
            router.push('/login')
        }
    }, [user, router]) // The dependencies ensure this effect runs when the user or router objects change.

    // A handler function to update the form data state based on user input.
    const onHandleInputChange = (field: string, value: string) => {
        setFormData((prev: any) => (
            {
                ...prev,
                [field]: value
            }
        ))
    }

    // The main function that handles the form submission and API call to generate the product image.
    const OnGenerate = async () => {

        // Basic validation: checks if either a file or a direct image URL has been provided.
        if (!formData?.file && !formData?.imageUrl) {
            alert('Please upload a Product Image or provide an image URL.');
            return;
        }

        setLoading(true);

        // Creates a new FormData object to prepare the data for the API request. This is standard for sending files.
        const formData_ = new FormData();
        //@ts-ignore // This is a TypeScript-specific comment to ignore potential type errors.
        formData_.append('file', formData?.file);
        formData_.append('imageUrl', formData?.imageUrl ?? '');
        formData_.append('description', formData?.description ?? '')
        formData_?.append('size', formData?.size ?? '1028x1028');
        formData_?.append('userEmail', user?.email ?? '')
        formData_?.append('avatar', formData?.avatar ?? '');

        try {
            // Makes the POST request to the API endpoint.
            const result = await axios.post('/api/generate-product-image', formData_);
            console.log(result.data);

            // Checks the API response for an error flag and displays a toast notification if an error occurs.
            if (result.data.error) {
                toast.error('Please Try Again');
            }
        } catch (error) {
            // Catches any network or API-related errors.
            console.error('API call failed:', error);
            toast.error('An error occurred. Please try again.');
        } finally {
            // Ensures the loading state is set to false regardless of success or failure.
            setLoading(false);
        }
    }

    return (
        <div>
            <h2 className='font-bold text-2xl mb-3'>{title ? title : 'AI Product Image Generator'}</h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                <div>
                    <FormInput
                        onHandleInputChange={(field: string, value: string) => onHandleInputChange(field, value)}
                        OnGenerate={OnGenerate}
                        loading={loading}
                        enableAvatar={enableAvatar}
                    />
                </div>
                <div className='md:col-span-2'>
                    <PreviewResult />
                </div>
            </div>
        </div>
    )
}

export default ProductImages