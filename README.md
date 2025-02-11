# Member Sorter

A Visual Studio Code extension that sorts class members by access modifier and type.

## Features

- Sorts class members in the following order:
  1. Fields
  2. Properties
  3. Methods
- Within each category, members are sorted by:
  1. Access modifier (public → protected → private)
  2. Alphabetically by name
- Supports:
  - C# classes
  - Partial classes
  - Properties with get/set
  - Fields with initializers
  - Methods with complex bodies
  - Override methods

## Usage

1. Open a C# file
2. Place your cursor inside a class
3. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on Mac)
4. Type "Sort Class Members" and select the command

## Example

Before:

```csharp
public class Example
{
    private string _name;
    public int Age { get; set; }
    protected void DoSomething() { }
    public string Name { get; set; }
}
```

After:

```csharp
public class Example
{
    private string _name;

    public int Age { get; set; }
    public string Name { get; set; }

    protected void DoSomething() { }
}
```

## Requirements

- Visual Studio Code 1.60.0 or newer

## Known Issues

- Method bodies with complex nested braces might not be parsed correctly
- Comments between members are not preserved

## Release Notes

### 0.0.1

Initial release:
- Basic member sorting functionality
- Support for C# classes
- Sorting by access modifier and type
