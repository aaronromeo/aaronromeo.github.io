# AGENTS.md

## Working Agreements

### Plan Mode First
- Always start in plan mode when beginning a new task
- Discuss requirements, validate assumptions, and outline approach before making changes
- Only exit plan mode and execute after the plan is approved

### File System Modifications
- After every command that modifies the file system (write, edit, delete, mkdir, rm, etc.), confirm the operation was successful
- Verify changes by reading the file or checking the directory state
- Report any failures immediately

### Command Execution
- Require explicit permission before executing commands that modify the file system
- Do not execute destructive or irreversible commands without clear user approval
- Exception: If user explicitly says "proceed without asking" or similar, you may execute without confirmation

### General Guidelines
- Be concise and direct in responses
- Follow existing code conventions in this project
- Run build/lint commands to verify changes when applicable

