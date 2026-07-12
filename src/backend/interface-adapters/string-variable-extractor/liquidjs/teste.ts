import { Liquid } from 'liquidjs'

const engine = new Liquid({})

const stringTemplate = `
{% capture variable %}
  valueek
{% endcapture %}

participou do evento realizado em {{ data }}, como {% if é_palestrante %}palestrante, tendo ministrado{% else %}ouvinte, tendo assistido{% endif %} a(s) seguinte(s) atividade(s):
{% for palestra in palestras %}
 ◆ {{ palestra }}
{% endfor %}

{% assign variable_name = value %}
`

const teste = engine.variablesSync(stringTemplate)
const uniqueVariables = engine.globalVariablesSync(stringTemplate)
console.log(teste)
console.log(uniqueVariables)
