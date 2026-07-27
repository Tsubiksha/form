def is_empty_value(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def normalize_text(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value or "").strip().lower()


def as_number(value):
    try:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def comparison_list(value):
    if isinstance(value, (list, tuple, set)):
        return {normalize_text(item) for item in value if normalize_text(item) != ""}
    return {normalize_text(item) for item in str(value or "").split(",") if normalize_text(item) != ""}


def field_id(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def compare(operator, answer, comparison):
    empty = is_empty_value(answer)
    if operator == "is_empty":
        return empty
    if operator == "is_not_empty":
        return not empty
    if empty:
        return False

    if operator in {"greater_than", "less_than"}:
        left = as_number(answer)
        right = as_number(comparison)
        if left is None or right is None:
            return False
        return left > right if operator == "greater_than" else left < right

    if operator in {"in", "not_in"}:
        allowed = comparison_list(comparison)
        if isinstance(answer, (list, tuple, set)):
            matched = any(normalize_text(item) in allowed for item in answer)
        else:
            matched = normalize_text(answer) in allowed
        return matched if operator == "in" else not matched

    if isinstance(answer, (list, tuple, set)):
        values = [normalize_text(item) for item in answer]
        target = normalize_text(comparison)
        if operator == "equals":
            return target in values
        if operator == "not_equals":
            return target not in values
        if operator == "contains":
            return any(target in item for item in values)
        return False

    left = normalize_text(answer)
    right = normalize_text(comparison)
    if operator == "equals":
        return left == right
    if operator == "not_equals":
        return left != right
    if operator == "contains":
        return right in left
    return False


def evaluate_conditional_rules(fields, rules, answers):
    fields = fields or []
    rules = rules or []
    answers = answers or {}
    states = {
        str(field.get("id")): {
            "visible": True,
            "required": bool(field.get("required")),
        }
        for field in fields
    }
    grouped = {}
    for rule in rules:
        target = str(rule.get("target_field_id"))
        if target not in states:
            continue
        grouped.setdefault(target, []).append(rule)

    for target, target_rules in grouped.items():
        show_rules = [rule for rule in target_rules if rule.get("action") == "show"]
        hide_rules = [rule for rule in target_rules if rule.get("action") == "hide"]
        require_rules = [rule for rule in target_rules if rule.get("action") == "require"]
        optional_rules = [rule for rule in target_rules if rule.get("action") == "optional"]

        def matches(rule):
            trigger = str(rule.get("trigger_field_id"))
            answer = answers.get(trigger, answers.get(field_id(trigger)))
            return compare(rule.get("operator"), answer, rule.get("comparison_value"))

        any_hide = any(matches(rule) for rule in hide_rules)
        any_show = any(matches(rule) for rule in show_rules)
        if any_hide:
            states[target]["visible"] = False
        elif show_rules:
            states[target]["visible"] = any_show
        else:
            states[target]["visible"] = True

        for rule in require_rules:
            if matches(rule):
                states[target]["required"] = True
        for rule in optional_rules:
            if matches(rule):
                states[target]["required"] = False
        if not states[target]["visible"]:
            states[target]["required"] = False

    return {"field_states": states}
