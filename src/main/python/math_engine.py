import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python math_engine.py <expression>")
        sys.exit(1)

    expression = " ".join(sys.argv[1:])
    try:
        result = eval(expression, {"__builtins__": {}}, {
            "abs": abs, "round": round, "pow": pow,
            "min": min, "max": max, "sum": sum,
            "int": int, "float": float, "complex": complex,
            "len": len, "range": range, "str": str,
            "True": True, "False": False, "None": None
        })
        print(str(result))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
