/// <reference types="mocha" />
import * as assert from 'assert';
import * as vscode from 'vscode';
import { MemberSorter } from '../memberSorter';

suite('MemberSorter Test Suite', () => {
    test('Should not create duplicates when sorting', async () => {
        const code = `
            public class Test {
                public WorldPlayer Player { get; set; }
                public Camera2D Camera { get; set; }
                public ParallaxLayer Background { get; set; }
            }
        `;

        let resultText = '';
        const editor = {
            document: {
                getText: () => code,
                languageId: 'csharp',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                lineAt: (line: number) => ({ text: '    ' })
            },
            edit: async (callback: any) => {
                callback({
                    replace: (range: any, text: string) => {
                        resultText = text;
                    }
                });
            }
        } as any;

        const sorter = new MemberSorter();
        await sorter.sortMembers(editor);

        // Count the number of property declarations in the result
        const propertyCount = (resultText.match(/\{ get; set; \}/g) || []).length;
        assert.strictEqual(propertyCount, 3, 'Should not create duplicate properties');
    });
}); 