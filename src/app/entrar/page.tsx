import { GoogleLoginButton } from './google-login-button'
import { LoginForm } from './login-form'

export default function Entrar() {
    return (
        <div>
            <h1>Entrar</h1>
            <span>Escolha a forma de login</span>

            <GoogleLoginButton />

            <div>OU CONTINUE COM</div>

            <LoginForm />

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
    )
}
