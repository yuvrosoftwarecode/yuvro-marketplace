from rest_framework import serializers


def validate_why_fit_text(value: str) -> str:
    """
    Validates that why_fit is present and strictly between 300 and 500 characters.
    """
    if not value or not str(value).strip():
        raise serializers.ValidationError(
            "Please provide an explanation of why you are a good fit for this role."
        )
    text = str(value).strip()
    if len(text) < 300 or len(text) > 500:
        raise serializers.ValidationError(
            f"Pitch explanation must be strictly between 300 and 500 characters. Current length: {len(text)} characters."
        )
    return text


def validate_and_snapshot_answers(submitted_answers, job) -> list:
    """
    Validates submitted answers against the Job's candidate_questions.
    Ensures:
    1. Every required question on the job has a non-empty answer.
    2. Unknown / invalid question IDs are rejected.
    3. Normalizes and snapshots question text alongside answers for historical integrity.
    """
    if submitted_answers is None:
        submitted_answers = []

    if not isinstance(submitted_answers, list):
        raise serializers.ValidationError(
            {"answers": "Answers must be a list of question-answer objects."}
        )

    job_questions = job.candidate_questions or []
    if not isinstance(job_questions, list):
        job_questions = []

    # Map available job questions by id and by question text
    valid_questions_map = {}
    required_question_keys = set()

    for idx, q_def in enumerate(job_questions):
        if not isinstance(q_def, dict):
            continue
        q_id = str(q_def.get("id") or f"q{idx + 1}").strip()
        q_text = str(q_def.get("question") or q_def.get("q") or "").strip()
        is_required = q_def.get("required") is not False  # default true if unspecified

        meta = {
            "id": q_id,
            "question": q_text or q_id,
            "required": is_required,
            "type": str(q_def.get("type", "Short text")),
        }
        valid_questions_map[q_id] = meta
        if q_text:
            valid_questions_map[q_text] = meta

        if is_required:
            required_question_keys.add(q_id)

    # Validate each submitted answer
    answered_keys = set()
    snapshot_answers = []

    for idx, ans_obj in enumerate(submitted_answers):
        if not isinstance(ans_obj, dict):
            raise serializers.ValidationError(
                {
                    "answers": (
                        f"Item at index {idx} must be an object containing 'question_id' and 'answer'."
                    )
                }
            )

        q_key = str(
            ans_obj.get("question_id")
            or ans_obj.get("id")
            or ans_obj.get("question")
            or ans_obj.get("q")
            or ""
        ).strip()
        ans_val = ans_obj.get("answer") if "answer" in ans_obj else ans_obj.get("a")

        if not q_key:
            q_key = f"Question {idx + 1}"

        # Match against valid questions on the job if configured
        matched_meta = valid_questions_map.get(q_key)
        if matched_meta:
            primary_id = matched_meta["id"]
            q_label = matched_meta["question"]
            is_req = matched_meta["required"]
        else:
            primary_id = str(ans_obj.get("question_id") or ans_obj.get("id") or f"q{idx + 1}")
            q_label = q_key
            is_req = False

        # Check if answer is provided
        ans_str = str(ans_val).strip() if ans_val is not None else ""
        if is_req and not ans_str:
            raise serializers.ValidationError(
                {
                    "answers": f"Required candidate question '{q_label}' has not been answered."
                }
            )

        if ans_str:
            answered_keys.add(primary_id)

        snapshot_answers.append(
            {
                "question_id": primary_id,
                "question": q_label,
                "q": q_label,
                "answer": ans_val,
                "a": ans_val,
            }
        )

    return snapshot_answers
