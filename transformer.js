/**
 * STAGE 1: AST to Pseudocode
 */
function generatePseudocode(node) {
    let lines = [];
    // Basic Recursive Descent
    function traverse(n) {
        if (n.type === 'if_statement') {
            lines.push(`IF "${n.child(1).text}"`);
            traverse(n.child(4)); // traverse body
        } else if (n.type === 'expression_statement') {
            lines.push(`ACTION: ${n.text}`);
        }
        for (let i = 0; i < n.childCount; i++) {
            if (!['if_statement', 'expression_statement'].includes(n.child(i).type)) {
                traverse(n.child(i));
            }
        }
    }
    traverse(node);
    return lines.join('\n') || "Wait for code input...";
}

/**
 * STAGE 2A: Pseudocode to Blockly
 */
function pseudoToBlocklyJSON(pseudo) {
    const lines = pseudo.split('\n');
    return lines.map((line, index) => {
        if (line.startsWith('IF')) {
            return {
                "type": "controls_if",
                "inputs": { "IF0": { "block": { "type": "text", "fields": { "TEXT": line } } } }
            };
        }
        return { "type": "text_print", "inputs": { "TEXT": { "block": { "type": "text", "fields": { "TEXT": line } } } } };
    });
}

/**
 * STAGE 2B: Pseudocode to Mermaid
 */
function pseudoToMermaid(pseudo) {
    let graph = "graph TD\n  Start((Start))";
    const lines = pseudo.split('\n');
    lines.forEach((line, i) => {
        const clean = line.replace(/"/g, '');
        graph += `\n  Step${i}[${clean}]`;
        if (i === 0) graph += `\n  Start --> Step${i}`;
        else graph += `\n  Step${i-1} --> Step${i}`;
    });
    return graph;
}
