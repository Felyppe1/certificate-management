'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";

export default function Entrar() {
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
        <div>
            <h1>Entrar</h1>
            <span>Escolha a forma de login</span>
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
            
            <div>OU CONTINUE COM</div>
            <form action="">
                <div className='flex flex-col gap-2'>
                    <label htmlFor="email">Email</label>
                    <Input type="email" id="email" name="email" required />
                    <label htmlFor="password">Senha</label>
                    <Input type="email" id="password" name="password" required />
                </div>
                <Button type="submit">Entrar</Button>
            </form>
            {/* <GoogleLogin 
                onSuccess={(credentialResponse) => {
                    console.log('Login bem-sucedido:', credentialResponse);
                }}
                onError={() => {
                    console.log('Erro ao fazer login');
                }}
                auto_select
            /> */}
        </div>
    );
}