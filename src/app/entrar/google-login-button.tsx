'use client'

import { useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";

export function GoogleLoginButton() {
    const googleLogin = useGoogleLogin({
        onSuccess: async ({ code }) => {
            const tokens = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            console.log(tokens);
        },
        flow: 'auth-code',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
    });
    
    return (
        <button
            onClick={() => googleLogin()}
            className="bg-white border rounded-md px-4 py-2 flex items-center gap-2 shadow"
        >
            <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
            />
            <span className="text-black">Entrar com Google</span>
        </button>
    )
}