import * as vscode from 'vscode';
import { IMember } from './types';
import { CSharpParser } from './csharpParser';

export class Parser {
    private csharpParser: CSharpParser;

    constructor() {
        this.csharpParser = new CSharpParser();
    }

    public async parseDocument(document: vscode.TextDocument): Promise<IMember[]> {
        const language = document.languageId;
        
        switch (language) {
            case 'typescript':
            case 'javascript':
                return this.parseTypeScript(document);
            case 'csharp':
                return this.csharpParser.parseDocument(document);
            default:
                vscode.window.showWarningMessage('Unsupported language');
                return [];
        }
    }

    private parseTypeScript(document: vscode.TextDocument): IMember[] {
        const text = document.getText();
        const members: IMember[] = [];
        
        // Separate regex for properties and methods in TypeScript/JavaScript
        const propertyRegex = /(?:(public|private|protected)\s+)?(\w+)\s*(?::\s*[\w<>[\]]+\s*)?(?:=.+?;|;|\s*{\s*get;?\s*set;?\s*})/g;
        const methodRegex = /(?:(public|private|protected)\s+)?(\w+)\s*\([^)]*\)\s*{[^}]*}/g;
        
        // Parse properties
        let match;
        while ((match = propertyRegex.exec(text)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            members.push({
                name,
                accessModifier,
                text: match[0],
                range: new vscode.Range(startPos, endPos),
                type: 'property'
            });
        }

        // Parse methods
        while ((match = methodRegex.exec(text)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            members.push({
                name,
                accessModifier,
                text: match[0],
                range: new vscode.Range(startPos, endPos),
                type: 'method'
            });
        }
        
        return members;
    }

    private parseCSharp(document: vscode.TextDocument): IMember[] {
        const text = document.getText();
        const members: IMember[] = [];
        const seenMembers = new Set<string>(); // Track duplicates
        
        // Find the class opening brace
        const classMatch = text.match(/\s*public\s+(?:partial\s+)?class\s+\w+(?:\s*:\s*\w+)?\s*\{/);
        if (!classMatch) {
            return members;
        }
        
        // Find matching closing brace for class
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
        
        // Only parse the class body
        const textToParse = text.slice(classStart, classEnd);
        
        // Order of parsing matters: fields -> properties -> methods
        const propertyRegex = /(?:(public|private|protected|internal)\s+)(?:virtual\s+)?(?:[\w<>[\]]+\s+)?(\w+)\s*{\s*get;\s*set;\s*}/g;
        const fieldRegex = /(?:(public|private|protected|internal)\s+)(?:readonly\s+)?(?:[\w<>[\]]+\s+)(\w+)(?:\s*=\s*[^;]+)?;/g;
        const methodRegex = /(?:(public|private|protected|internal)\s+)(?:override\s+)?(?:virtual\s+)?(?:async\s+)?(?:[\w<>[\]]+\s+)+(\w+)\s*\([^)]*\)\s*{(?:[^{}]|{[^{}]*})*}/gs;
        
        // Parse fields first
        let match;
        while ((match = fieldRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1];
            const name = match[2];
            
            if (seenMembers.has(name)) continue;
            seenMembers.add(name);
            
            const startPos = document.positionAt(classStart + match.index);
            const endPos = document.positionAt(classStart + match.index + match[0].length);
            
            members.push({
                name,
                accessModifier,
                text: match[0].trim(),
                range: new vscode.Range(startPos, endPos),
                type: 'field'
            });
        }

        // Then properties
        while ((match = propertyRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            
            // Skip duplicates
            if (seenMembers.has(name)) {
                continue;
            }
            seenMembers.add(name);
            
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            // Preserve original indentation
            const lines = match[0].split('\n');
            const indent = lines[0].match(/^\s*/)?.[0] || '';
            const formattedText = lines.map(line => line.trim()).join('\n' + indent);
            
            members.push({
                name,
                accessModifier,
                text: formattedText,
                range: new vscode.Range(startPos, endPos),
                type: 'property'
            });
        }

        // Parse methods
        while ((match = methodRegex.exec(textToParse)) !== null) {
            const accessModifier = match[1] || 'public';
            const name = match[2];
            
            // Skip duplicates
            if (seenMembers.has(name)) {
                continue;
            }
            seenMembers.add(name);
            
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            members.push({
                name,
                accessModifier,
                text: match[0].trim(),
                range: new vscode.Range(startPos, endPos),
                type: 'method'
            });
        }
        
        return members;
    }
} 