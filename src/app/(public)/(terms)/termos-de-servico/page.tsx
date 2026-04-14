export default function TermsOfServicePage() {
    return (
        <>
            <div className="bg-card rounded-lg shadow-lg border border-border p-6 sm:p-8 md:p-10">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
                    Termos de Serviço do Certifica
                </h1>
                <p className="text-sm text-foreground/70 mb-8">
                    Última atualização: 17 de Dezembro de 2025
                </p>

                <div className="space-y-6 text-foreground/90">
                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            1. Aceitação dos Termos
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Ao acessar e usar o site e os serviços oferecidos
                            pelo Certifica, você concorda em cumprir e ficar
                            vinculado aos seguintes termos e condições de uso.
                            Se você não concordar com qualquer parte destes
                            termos, não deverá acessar ou usar nossos serviços.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            2. Descrição do Serviço
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed mb-4">
                            O Certifica é uma plataforma SaaS (Software as a
                            Service) projetada para facilitar a gestão e emissão
                            de certificados. Nossos serviços permitem que o
                            usuário:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li className="text-sm sm:text-base leading-relaxed">
                                Carregue templates de certificados;
                            </li>
                            <li className="text-sm sm:text-base leading-relaxed">
                                Carregue fontes de dados;
                            </li>
                            <li className="text-sm sm:text-base leading-relaxed">
                                Mapeie variáveis;
                            </li>
                            <li className="text-sm sm:text-base leading-relaxed">
                                Gere arquivos em formato PDF;
                            </li>
                            <li className="text-sm sm:text-base leading-relaxed">
                                Envie os certificados gerados por e-mail.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            3. Integração com Conta Google e Google Drive
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed mb-4">
                            Para facilitar o uso e a importação de dados, o
                            Certifica oferece integração com a sua conta do
                            Google ("Google Sign-In" e acesso ao "Google
                            Drive").
                        </p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Permissões:
                                    </strong>{' '}
                                    Ao conectar sua conta, você nos autoriza a
                                    acessar os arquivos do seu Google Drive
                                    estritamente para a finalidade de importar
                                    templates ou planilhas de dados necessários
                                    para a geração dos certificados.
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Segurança:
                                    </strong>{' '}
                                    Não armazenamos sua senha do Google. O
                                    acesso é feito através de tokens de
                                    autenticação seguros (OAuth).
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Limites:
                                    </strong>{' '}
                                    Não lemos, modificamos ou excluímos outros
                                    arquivos do seu Google Drive que não estejam
                                    relacionados à operação solicitada por você
                                    na plataforma.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            4. Propriedade Intelectual e Conteúdo do Usuário
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Seus Dados:
                                    </strong>{' '}
                                    Você mantém todos os direitos de propriedade
                                    intelectual sobre os templates, dados de
                                    destinatários (listas de e-mails/nomes) e
                                    logotipos que enviar ao Certifica. Não
                                    reivindicamos propriedade sobre o seu
                                    conteúdo.
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Licença de Uso:
                                    </strong>{' '}
                                    Ao fazer upload de conteúdo, você concede ao
                                    Certifica uma licença mundial, não exclusiva
                                    e isenta de royalties apenas para usar,
                                    hospedar, armazenar e reproduzir o conteúdo
                                    conforme necessário para fornecer o serviço
                                    a você (ex: gerar o PDF e enviar o e-mail).
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Propriedade do Certifica:
                                    </strong>{' '}
                                    O código-fonte, design, layout, logotipo e
                                    software do Certifica são de propriedade
                                    exclusiva de seus operadores.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            5. Responsabilidades do Usuário
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed mb-4">
                            Além do "Compromisso do Usuário" já estabelecido em
                            nossa Política de Privacidade, você concorda
                            expressamente em:
                        </p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Não enviar SPAM:
                                    </strong>{' '}
                                    O serviço de envio de e-mails do Certifica
                                    deve ser usado apenas para enviar
                                    certificados solicitados ou esperados pelos
                                    destinatários. É proibido usar a plataforma
                                    para envio de e-mails em massa não
                                    solicitados.
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Veracidade dos Dados:
                                    </strong>{' '}
                                    Garantir que as informações inseridas para a
                                    geração dos certificados são verdadeiras e
                                    não infringem direitos de terceiros.
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Segurança da Conta:
                                    </strong>{' '}
                                    Você é responsável por manter a
                                    confidencialidade do acesso à sua conta
                                    Google e por todas as atividades que ocorram
                                    sob sua autenticação.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            6. Limitação de Responsabilidade
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed mb-4">
                            O serviço é fornecido "como está" e "conforme
                            disponível":
                        </p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Garantias:
                                    </strong>{' '}
                                    O Certifica não garante que o serviço será
                                    ininterrupto, livre de erros ou que os
                                    e-mails enviados chegarão 100% das vezes à
                                    caixa de entrada do destinatário (devido a
                                    filtros de spam de terceiros).
                                </p>
                            </div>
                            <div>
                                <p className="text-sm sm:text-base leading-relaxed">
                                    <strong className="text-foreground">
                                        Danos:
                                    </strong>{' '}
                                    Em nenhuma circunstância o Certifica ou seus
                                    fornecedores serão responsáveis por
                                    quaisquer danos (incluindo, sem limitação,
                                    danos por perda de dados ou lucro, ou devido
                                    a interrupção dos negócios) decorrentes do
                                    uso ou da incapacidade de usar os materiais
                                    do Certifica.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            7. Cancelamento e Suspensão
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Reservamo-nos o direito de suspender ou encerrar o
                            seu acesso ao serviço imediatamente, sem aviso
                            prévio ou responsabilidade, por qualquer motivo,
                            inclusive se você violar estes Termos de Serviço
                            (por exemplo, utilizando o sistema para enviar
                            conteúdo malicioso ou spam).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            8. Links para Terceiros
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Nosso serviço pode conter links para sites de
                            terceiros ou serviços que não são de propriedade ou
                            controlados pelo Certifica. Não temos controle e não
                            assumimos responsabilidade pelo conteúdo, políticas
                            de privacidade ou práticas de quaisquer sites ou
                            serviços de terceiros (incluindo o Google).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            9. Alterações nos Termos
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            O Certifica pode revisar estes termos de serviço a
                            qualquer momento, sem aviso prévio. Ao usar este
                            site, você concorda em ficar vinculado à versão
                            atual desses Termos de Serviço.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            10. Lei Aplicável
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Estes termos e condições são regidos e interpretados
                            de acordo com as leis do Brasil e você se submete
                            irrevogavelmente à jurisdição exclusiva dos
                            tribunais naquele estado ou localidade.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                            11. Contato
                        </h2>
                        <p className="text-sm sm:text-base leading-relaxed">
                            Se você tiver alguma dúvida sobre estes Termos,
                            entre em contato conosco através do e-mail:{' '}
                            <a
                                href="mailto:felyppe.nunes1@gmail.com"
                                className="text-blue-500 hover:text-blue-400 underline transition-colors"
                            >
                                felyppe.nunes1@gmail.com
                            </a>
                            .
                        </p>
                    </section>
                </div>
            </div>
        </>
    )
}
