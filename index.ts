import { ChatPromptTemplate } from "@langchain/core/prompts";
import { DynamicTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";

process.env.OPENAI_API_KEY = "...";

export async function testStream() {
	const llm = new ChatOpenAI({
		modelName: "gpt-3.5-turbo-1106",
		temperature: 0,
		streaming: true,
	});

	const tools = [
		new DynamicTool({
			name: "FOO",
			description: "test",
			func: async () => "baz",
		}),
	];

	const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

	const agent = await createOpenAIFunctionsAgent({
		llm,
		tools,
		prompt,
	});

	const agentExecutor = new AgentExecutor({
		agent,
		tools,
		// verbose: true,
	});

	const stream = await agentExecutor.streamLog({
		input: "tell me a short story",
	});

	console.log("***************************************************** starting streaming");

	let firstChunkTime: number | null = null;
	for await (const chunk of stream) {
		if (firstChunkTime === null) firstChunkTime = new Date().getTime();
		if (chunk.ops?.length > 0 && chunk.ops[0].op === "add") {
			const addOp = chunk.ops[0];
			if (
				addOp.path.startsWith("/logs/ChatOpenAI") &&
				typeof addOp.value === "string" &&
				addOp.value.length
			) {
				process.stdout.write(addOp.value);
			}
		}
	}

	console.log();
	console.log("Time to complete after first chunk:", new Date().getTime() - firstChunkTime!);

	console.log("***************************************************** done streaming");

	return agentExecutor;
}

testStream();
