
interface TrustedHTML {}
interface TrustedScript {}
interface TrustedScriptURL {}

interface HTMLScriptElement {
    textContent: string | TrustedScript | null;
}

interface Node {
    textContent: string | TrustedScript | null;
}

interface Window {
    trustedTypes?: {
    createPolicy: (
        name: string,
        rules: {
        createHTML?: (input: string) => string;
        createScript?: (input: string) => string;
        createScriptURL?: (input: string) => string;
        }
    ) => {
        createHTML: (input: string) => TrustedHTML;
        createScript: (input: string) => TrustedScript;
        createScriptURL: (input: string) => TrustedScriptURL;
    };
    defaultPolicy?: {
        createHTML: (input: string) => TrustedHTML;
        createScript: (input: string) => TrustedScript;
        createScriptURL: (input: string) => TrustedScriptURL;
    };
    };
}
export{};
