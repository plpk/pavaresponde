// Cuenta con exactitud los tokens del prompt que se manda en cada pregunta.
// El conteo es gratis; hace falta ANTHROPIC_API_KEY.
import reglamento from "../src/data/reglamento.json";
import { MODELO_RESPUESTAS, getClient, hasClaudeCredentials, systemReglamento } from "../src/lib/answer/prompt";

async function main() {
  if (!hasClaudeCredentials()) {
    console.error("Falta ANTHROPIC_API_KEY.");
    process.exit(1);
  }
  const res = await getClient().messages.countTokens({
    model: MODELO_RESPUESTAS,
    system: systemReglamento(reglamento.text),
    messages: [{ role: "user", content: "¿Quién puede votar el 11 de octubre?" }],
  });
  console.log(`${MODELO_RESPUESTAS}: ${res.input_tokens} tokens de entrada por pregunta (Reglamento + instrucciones + pregunta).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
