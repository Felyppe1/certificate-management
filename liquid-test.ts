import { Liquid } from "liquidjs";
import z from "zod";

const engine = new Liquid({
    // timezoneOffset: 0
})

console.log(new Date())
const text = `
{% assign ultima_letra = nome | slice: -1 %}
{{ ultima_letra }}
{% if ultima_letra == 8 %}
NUMERO
{% else %}
OUTRO
{% endif %}
{% if letra == '1' %}
E
{% endif %}
{{ data | date: "%d/%m/%Y %H:%M:%S" }}
`

const result = engine.parseAndRenderSync(text, {
    nome: 'Felyppe',
    data: '2026-01-01T15:30:00.000-03:00',
    letra: '1',
    idade: '30.7',
    verdadeiro: 'false',
})

console.log(result)

const variables = engine.variablesSync(text)
console.log(variables)
