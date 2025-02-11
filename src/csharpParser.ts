import * as vscode from 'vscode';
import { IMember } from './types';

export class CSharpParser {
    public async parseDocument(document: vscode.TextDocument): Promise<IMember[]> {
        return this.parseWithRegex(document);
    }

    private parseWithRegex(document: vscode.TextDocument): IMember[] {
        const text = document.getText();
        const members: IMember[] = [];
        const seenMembers = new Set<string>();
        
        // Find the class opening brace
        const classMatch = text.match(/\s*public\s+(?:partial\s+)?class\s+\w+(?:\s*:\s*\w+)?\s*\{/);
        if (!classMatch) return members;
        
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
        
        const textToParse = text.slice(classStart, classEnd);
        
        // Parse fields
        const fieldRegex = /(?:(public|private|protected|internal)\s+)(?:readonly\s+)?(?:[\w<>[\]]+\s+)(\w+)(?:\s*=\s*[^;]+)?;/g;
        let match;
        while ((match = fieldRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            
            if (seenMembers.has(name)) continue;
            seenMembers.add(name);
            
            members.push({
                name,
                accessModifier,
                text: match[0].trim(),
                range: new vscode.Range(
                    document.positionAt(classStart + match.index),
                    document.positionAt(classStart + match.index + match[0].length)
                ),
                type: 'field'
            });
        }

        // Parse properties
        const propertyRegex = /(?:(public|private|protected|internal)\s+)(?:virtual\s+)?(?:[\w<>[\]]+\s+)?(\w+)\s*{\s*get;\s*set;\s*}/g;
        while ((match = propertyRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            
            if (seenMembers.has(name)) continue;
            seenMembers.add(name);
            
            members.push({
                name,
                accessModifier,
                text: match[0].trim(),
                range: new vscode.Range(
                    document.positionAt(classStart + match.index),
                    document.positionAt(classStart + match.index + match[0].length)
                ),
                type: 'property'
            });
        }

        // Parse methods
        const methodRegex = /(?:(public|private|protected|internal)\s+)(?:override\s+)?(?:virtual\s+)?(?:async\s+)?(?:[\w<>[\]]+\s+)+(\w+)\s*\([^)]*\)\s*{[\s\S]*?(?:(?<!\/\/[^\n]*)\})/gm;
        while ((match = methodRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            
            if (name === this.getClassName(text)) continue;
            
            if (seenMembers.has(name)) continue;
            seenMembers.add(name);
            
            let methodText = match[0];
            let openBraces = (methodText.match(/{/g) || []).length;
            let closeBraces = (methodText.match(/}/g) || []).length;
            
            while (openBraces > closeBraces) {
                const nextCloseBrace = textToParse.indexOf('}', match.index + methodText.length);
                if (nextCloseBrace === -1) break;
                methodText = textToParse.substring(match.index, nextCloseBrace + 1);
                openBraces = (methodText.match(/{/g) || []).length;
                closeBraces = (methodText.match(/}/g) || []).length;
            }
            
            members.push({
                name,
                accessModifier,
                text: methodText.trim(),
                range: new vscode.Range(
                    document.positionAt(classStart + match.index),
                    document.positionAt(classStart + match.index + methodText.length)
                ),
                type: 'method'
            });
        }
        
        return members;
    }

    private getClassName(text: string): string {
        const classMatch = text.match(/\s*public\s+(?:partial\s+)?class\s+(\w+)/);
        return classMatch ? classMatch[1] : '';
    }
} 