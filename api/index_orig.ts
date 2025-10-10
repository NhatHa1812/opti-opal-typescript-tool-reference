import express from "express";
import { ParameterType, ToolsService, tool } from "@optimizely-opal/opal-tools-sdk";
import { requiresAuth } from "@optimizely-opal/opal-tools-sdk";

const app = express();
app.use(express.json());

const toolsService = new ToolsService(app);

interface EchoModel {
    text: string;
    shout: boolean;
}

class EchoTools {
    @requiresAuth({ provider: "OptiID", scopeBundle: "default", required: true })
    @tool({
        name: "echo",
        description: "Echo input back (optionally uppercased).",
        parameters: [{
            name: "text",
            description: "",
            required: true,
            type: ParameterType.String
        }],
        // authRequirements: {
        //     provider: "OptiID",
        //     scopeBundle: "default",
        //     required: true
        // }
    })
    async echo(params: EchoModel) {
        const out = params.shout ? params.text.toUpperCase() : params.text;
        return {
            content_type: "text/markdown",
            content: `**Echo**: ${out}`
        };
    }
}

export { app };

const PORT = Number(process.env.PORT || 3000);

// If we're NOT in Vercel, start a local server.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Local server listening on http://localhost:${PORT}`);
    });
}