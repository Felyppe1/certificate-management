import { Liquid } from "liquidjs";
import z from "zod";

const engine = new Liquid({
    // timezoneOffset: 0
})

console.log(new Date())
const text = `
por que esse texto no liquid: {% assign ultima_letra = nome | slice: -1 %} {{ ultima_letra }} {% if ultima_letra == 8 %}her{% else %}his{% endif %} academic goals and aspirations. {{ data | date: "%d/%m/%Y %H:%M:%S" }}
`

const result = engine.parseAndRenderSync(text, {
    nome: 'Felyppe',
    idade: '30.7',
    verdadeiro: 'false',
    data: '2026-01-01T15:30:00.000-03:00'
})

const variables = engine.variablesSync(text)
console.log(variables)
console.log(result)

console.log(Boolean('false').valueOf())
const parsed = z.coerce.boolean().safeParse('false')
console.log(parsed)
// function isDate(value: string): boolean {
//   // 1️⃣ formato exato YYYY-MM-DD
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//     return false;
//   }

//   // 2️⃣ validação real da data
//   const [year, month, day] = value.split('-').map(Number);

//   const date = new Date(Date.UTC(year, month - 1, day));

//   return (
//     date.getUTCFullYear() === year &&
//     date.getUTCMonth() === month - 1 &&
//     date.getUTCDate() === day
//   );
// }

// console.log(isDate("2023-02-29"))