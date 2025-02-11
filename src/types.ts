import * as vscode from 'vscode';

export interface IMember {
    name: string;
    accessModifier: string;
    text: string;
    range: vscode.Range;
    type: 'property' | 'method' | 'field';
} 