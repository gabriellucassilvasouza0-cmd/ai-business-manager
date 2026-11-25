// Testes das funções puras do front-end (rodar com: node tests/logic.test.mjs).
import assert from 'node:assert/strict';
import { calcPricing, md, nextCommercialDate, commercialDates, toCSV, esc, parseDec } from '../src/lib.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('precificação: recomendado e mínimo', () => {
  const r = calcPricing({ cost: '95', freight: '8', fee: '4,99', tax: '0', margin: '30' });
  assert.equal(r.ct, 103);
  assert.ok(Math.abs(r.min - 103 / (1 - 0.0499)) < 1e-9);
  assert.ok(Math.abs(r.rec - 103 / (1 - 0.0499 - 0.3)) < 1e-9);
  assert.equal(r.charm.toFixed(2), (Math.ceil(r.rec - 0.9) + 0.9).toFixed(2));
});
t('precificação: soma >= 100% é recusada', () => { assert.ok(calcPricing({ cost: '10', fee: '50', tax: '0', margin: '50' }).error); });
t('precificação: custo inválido', () => { assert.ok(calcPricing({ cost: 'abc', margin: '30' }).error); });
t('parseDec aceita vírgula e milhar', () => { assert.equal(parseDec('1.234,56'), 1234.56); assert.equal(parseDec(''), null); assert.ok(Number.isNaN(parseDec('x'))); });
t('markdown escapa HTML', () => {
  const h = md('**ok** <img src=x onerror=alert(1)>\n- item <b>');
  assert.ok(h.includes('<strong>ok</strong>'));
  assert.ok(!h.includes('<img')); assert.ok(h.includes('&lt;img'));
  assert.ok(h.includes('<li>item &lt;b&gt;</li>'));
});
t('esc cobre aspas', () => { assert.equal(esc(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;'); });
t('Black Friday 2026 é 27/11', () => { const bf = commercialDates(2026).find((d) => d.name === 'Black Friday').date; assert.equal(bf.getDate(), 27); assert.equal(bf.getMonth(), 10); });
t('Dia das Mães 2026 é 10/05', () => { const d = commercialDates(2026).find((x) => x.name === 'Dia das Mães').date; assert.equal(d.getDate(), 10); assert.equal(d.getMonth(), 4); });
t('Páscoa 2026 é 05/04', () => { const d = commercialDates(2026).find((x) => x.name === 'Páscoa').date; assert.equal(d.getDate(), 5); assert.equal(d.getMonth(), 3); });
t('próxima data a partir de 25/11/2026', () => { const x = nextCommercialDate(new Date(2026, 10, 25)); assert.equal(x.name, 'Black Friday'); assert.equal(x.days, 2); });
t('próxima data vira o ano', () => { const x = nextCommercialDate(new Date(2026, 11, 26)); assert.equal(x.name, 'Dia do Consumidor'); assert.equal(x.date.getFullYear(), 2027); });
t('CSV neutraliza fórmulas e escapa separador', () => {
  const csv = toCSV([['=HYPERLINK("x")', 'a;b', '+1', 'normal']]);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); assert.ok(csv.includes('"a;b"')); assert.ok(csv.includes("'+1")); assert.ok(csv.endsWith('normal'));
});
console.log(n + ' testes passaram');
