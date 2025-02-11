/// <reference types="mocha" />
import * as assert from 'assert';
import * as vscode from 'vscode';
import { Parser } from '../parser';

suite('Parser Test Suite', () => {
    const parser = new Parser();

    test('Should parse C# properties correctly', async () => {
        const code = `
            public class Test {
                public string Name { get; set; }
                private int Age { get; set; }
                protected bool IsActive { get; set; }
                public string Name { get; set; } // Duplicate
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 3, 'Should ignore duplicate properties');
        const firstMember = members[0];
        assert.strictEqual(firstMember.name, 'Name');
        assert.strictEqual(firstMember.accessModifier, 'public');
    });

    test('Should parse C# methods correctly', async () => {
        const code = `
            public class Test {
                public void Method1() { }
                private async Task Method2() { }
                protected override void Method3() => DoSomething();
                void Method4() => value;
                public async Task<string> Method5() {
                    return "";
                }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 5, 'Should parse all method types');
        const methodMembers = members.filter(m => m.type === 'method');
        assert.strictEqual(methodMembers.length, 5);
    });

    test('Should handle complex C# properties', async () => {
        const code = `
            public class Test {
                public string Name { 
                    get => _name; 
                    set => _name = value; 
                }
                private List<int> Numbers { get; set; }
                protected Dictionary<string, object> Data { get; set; }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 3);
        const firstMember = members[0];
        assert.strictEqual(firstMember.type, 'property');
    });

    test('Should preserve method bodies', async () => {
        const code = `
            public class Test {
                public void Method1() {
                    var x = 1;
                    DoSomething(x);
                }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 1);
        const firstMember = members[0];
        assert.ok(firstMember.text.includes('var x = 1'));
    });

    test('Should handle C# class with duplicates and overrides', async () => {
        const code = `
            public class Test {
                public WorldPlayer Player { get; set; }
                public Camera2D Camera { get; set; }
                public ParallaxLayer Background { get; set; }
                public Camera2D Camera { get; set; }  // Duplicate
                public WorldPlayer Player { get; set; }  // Duplicate

                public override void _Ready() {
                    // Method body
                }

                public override void _Process(double delta) {
                    // Method body
                }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 5, 'Should have 3 unique properties and 2 methods');
        
        const propertyMembers = members.filter(m => m.type === 'property');
        const methodMembers = members.filter(m => m.type === 'method');
        
        assert.strictEqual(propertyMembers.length, 3, 'Should have 3 unique properties');
        assert.strictEqual(methodMembers.length, 2, 'Should have 2 methods');
        assert.ok(methodMembers.some(m => m.text.includes('_Ready')));
        assert.ok(methodMembers.some(m => m.text.includes('_Process')));
    });

    test('Should handle C# fields and properties', async () => {
        const code = `
            public class Test {
                public Vector2 ZoomSpeed = new(0.1f, 0.1f);
                public Vector2 MinZoom = new(1.0f, 1.0f);
                private HubConnection _connection;
                public string PlayerId = Guid.NewGuid().ToString();
                public WorldPlayer Player { get; set; }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        const fields = members.filter(m => m.type === 'field');
        const properties = members.filter(m => m.type === 'property');
        
        assert.strictEqual(fields.length, 4, 'Should have 4 fields');
        assert.strictEqual(properties.length, 1, 'Should have 1 property');
        assert.ok(fields.some(f => f.name === 'ZoomSpeed'), 'Should include ZoomSpeed field');
        assert.ok(fields.some(f => f.name === '_connection'), 'Should include _connection field');
    });

    test('Should parse complete C# class correctly', async () => {
        const code = `
            public partial class World : Node2D
            {
                public Vector2 ZoomSpeed = new(0.1f, 0.1f);
                public WorldPlayer Player { get; set; }
                
                public override void _Ready()
                {
                    // Method body
                }
            }
        `;

        const document = {
            getText: () => code,
            languageId: 'csharp',
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const members = await parser.parseDocument(document);
        
        assert.strictEqual(members.length, 3, 'Should parse field, property, and method');
        assert.ok(members.some(m => m.type === 'field' && m.name === 'ZoomSpeed'));
        assert.ok(members.some(m => m.type === 'property' && m.name === 'Player'));
        assert.ok(members.some(m => m.type === 'method' && m.name === '_Ready'));
    });
}); 