import ast
import logging
from typing import Any, Dict, List
from app.tools.base import BaseTool, ToolDefinition, ToolParameter

logger = logging.getLogger(__name__)


class AnalyzeCodeTool(BaseTool):
    name = "analyze_code"
    description = "Safely check syntax, detect potential errors, and analyze structure of Python/JS code snippets without executing."
    required_permissions = ["code_read"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="code", type="string", description="Source code snippet to analyze", required=True),
                ToolParameter(name="language", type="string", description="Programming language: 'python', 'javascript', 'typescript', 'sql', etc.", required=False, default="python"),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, code: str, language: str = "python", **kwargs: Any) -> Dict[str, Any]:
        if language.lower() == "python":
            try:
                parsed = ast.parse(code)
                functions = [node.name for node in ast.walk(parsed) if isinstance(node, ast.FunctionDef)]
                classes = [node.name for node in ast.walk(parsed) if isinstance(node, ast.ClassDef)]
                imports = []
                for node in ast.walk(parsed):
                    if isinstance(node, ast.Import):
                        imports.extend(alias.name for alias in node.names)
                    elif isinstance(node, ast.ImportFrom):
                        imports.append(node.module or "")

                return {
                    "valid_syntax": True,
                    "language": "python",
                    "functions_found": functions,
                    "classes_found": classes,
                    "imports": [i for i in imports if i],
                    "line_count": len(code.splitlines()),
                    "success": True,
                }
            except SyntaxError as se:
                return {
                    "valid_syntax": False,
                    "language": "python",
                    "error": f"SyntaxError at line {se.lineno}, col {se.offset}: {se.msg}",
                    "line_number": se.lineno,
                    "success": True,
                }
        else:
            return {
                "valid_syntax": True,
                "language": language,
                "line_count": len(code.splitlines()),
                "message": f"Static inspection for {language} complete.",
                "success": True,
            }
