from pathlib import Path

ROOT = Path("src")

def repair(text):
    # Repair common UTF-8 -> Windows-1252/Latin-1 mojibake.
    for _ in range(3):
        try:
            repaired = text.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break

        # Only keep the conversion when it actually reduces mojibake.
        bad_before = sum(text.count(x) for x in ["â", "Â", "ð", "�"])
        bad_after = sum(repaired.count(x) for x in ["â", "Â", "ð", "�"])

        if bad_after < bad_before:
            text = repaired
        else:
            break

    return text


for path in ROOT.rglob("*"):
    if not path.is_file():
        continue

    if path.suffix.lower() not in {".js", ".jsx", ".css", ".html"}:
        continue

    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    repaired = repair(original)

    if repaired != original:
        path.write_text(repaired, encoding="utf-8", newline="")
        print("Fixed:", path)

print("Encoding repair complete.")