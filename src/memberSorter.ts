import * as vscode from 'vscode';
import { Parser } from './parser';
import { IMember } from './types';

export class MemberSorter {
    private getSortingStrategy(): 'accessModifier' | 'zeitungspapier' {
        return vscode.workspace.getConfiguration('memberSort').get('sortingStrategy', 'accessModifier');
    }

    private getAccessModifierOrder(): string[] {
        return vscode.workspace.getConfiguration('memberSort').get('accessModifierOrder', 
            ['public', 'protected', 'private']);
    }

    public async sortMembers(editor: vscode.TextEditor) {
        const document = editor.document;
        const parser = new Parser();
        const members = await parser.parseDocument(document);

        if (!members.length) {
            vscode.window.showInformationMessage('No members found to sort');
            return;
        }

        // Remove duplicates before sorting
        const uniqueMembers = members.filter((member: IMember, index: number, self: IMember[]) =>
            index === self.findIndex((m: IMember) => m.name === member.name)
        );

        const sortedMembers = this.sortMembersByStrategy(uniqueMembers);
        
        await editor.edit(editBuilder => {
            // Find the class opening brace
            const text = document.getText();
            const classMatch = text.match(/\s*public\s+(?:partial\s+)?class\s+\w+(?:\s*:\s*\w+)?\s*{/);
            if (!classMatch) return;
            
            // Find the range between opening and closing braces
            const classStart = classMatch.index! + classMatch[0].length;
            let braceCount = 1;
            let classEnd = classStart;
            
            for (let i = classStart; i < text.length; i++) {
                if (text[i] === '{') braceCount++;
                if (text[i] === '}') braceCount--;
                if (braceCount === 0) {
                    classEnd = i;
                    break;
                }
            }
            
            const range = new vscode.Range(
                document.positionAt(classStart),
                document.positionAt(classEnd)
            );

            // Group members by type
            const fields = sortedMembers.filter(m => m.type === 'field');
            const properties = sortedMembers.filter(m => m.type === 'property');
            const methods = sortedMembers.filter(m => m.type === 'method');
            
            // Get the indentation of the first member
            const firstLine = document.lineAt(document.positionAt(classStart).line);
            const baseIndent = firstLine.text.match(/^\s*/)?.[0] || '';
            const indent = baseIndent + '    '; // Add 4 spaces for member indentation
            
            const formattedText = [
                ...fields.map(f => indent + f.text),
                fields.length > 0 ? '' : null,
                ...properties.map(p => indent + p.text),
                properties.length > 0 ? '' : null,
                ...methods.map(m => {
                    // Ensure consistent indentation for multi-line methods
                    const lines = m.text.split('\n');
                    const formattedLines = lines.map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return '';
                        // First line gets normal indent, rest get extra indent
                        return (i === 0 ? indent : indent + '    ') + trimmed;
                    }).filter(Boolean).join('\n');
                    return formattedLines;
                })
            ].filter(Boolean).join('\n\n');
            
            editBuilder.replace(range, '\n' + formattedText + '\n');
        });
    }

    private sortMembersByStrategy(members: IMember[]): IMember[] {
        const accessModifierOrder = ['public', 'protected', 'private'];
        return this.sortByAccessModifier(members, accessModifierOrder);
    }

    private sortByAccessModifier(members: IMember[], order: string[]): IMember[] {
        return members.sort((a, b) => {
            // First sort by type (fields, then properties, then methods)
            if (a.type !== b.type) {
                const typeOrder = { field: 0, property: 1, method: 2 };
                return typeOrder[a.type] - typeOrder[b.type];
            }

            // Then by access modifier
            const accessA = order.indexOf(a.accessModifier);
            const accessB = order.indexOf(b.accessModifier);
            
            if (accessA !== accessB) {
                return accessA - accessB;
            }
            
            // Finally by name alphabetically
            return a.name.localeCompare(b.name);
        });
    }
} 