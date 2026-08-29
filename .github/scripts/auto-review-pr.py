#!/usr/bin/env python3
"""
Claude auto-reviews PR and approves if it passes review.
"""

import os
import subprocess
import sys
import requests


def get_bearer_token_and_region():
    """Get AWS credentials from environment."""
    bearer_token = os.getenv("AWS_BEARER_TOKEN")
    aws_region = os.getenv("AWS_REGION", "us-east-1")

    if not bearer_token:
        raise ValueError("AWS_BEARER_TOKEN environment variable is required")

    return bearer_token, aws_region


def get_pr_diff():
    """Get the diff of the current PR."""
    try:
        result = subprocess.run(
            ["git", "diff", "origin/main...HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        return result.stdout
    except Exception as e:
        print(f"Error getting diff: {e}", file=sys.stderr)
        return ""


def review_code_with_claude(diff: str, pr_title: str) -> tuple[bool, str]:
    """Review code and return (approved, review_comment)."""
    bearer_token, aws_region = get_bearer_token_and_region()

    prompt = f"""You are a code reviewer. Review the following PR changes and determine if they are acceptable.

**PR Title:** {pr_title}

**Changes:**
```
{diff}
```

Review the code for:
1. **Correctness** - Does it work?
2. **Quality** - Is the code clean and maintainable?
3. **Security** - Are there any security issues?
4. **Best practices** - Does it follow conventions?

Respond in this exact format:
APPROVED: [YES/NO]
REASON: [Brief explanation]
DETAILS: [Detailed review comments]

If APPROVED is YES, the PR will be merged automatically."""

    url = f"https://bedrock-runtime.{aws_region}.amazonaws.com/model/anthropic.claude-opus-5/invoke"

    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
    }

    body = {
        "anthropic_version": "bedrock-2023-06-01",
        "max_tokens": 2048,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(url, json=body, headers=headers, timeout=60)

    if response.status_code != 200:
        raise RuntimeError(f"Bedrock API error: {response.status_code} - {response.text}")

    result = response.json()
    response_text = ""

    if "content" in result:
        for block in result["content"]:
            if block.get("type") == "text":
                response_text += block.get("text", "")

    # Parse response
    approved = False
    if "APPROVED: YES" in response_text:
        approved = True

    return approved, response_text


def post_review_comment(pr_number: int, review_comment: str):
    """Post review comment on PR."""
    github_token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")

    if not github_token or not repo:
        return

    comment = f"""## 🤖 Claude Auto-Review

{review_comment}

---
*Review by Claude Bot*"""

    try:
        subprocess.run(
            [
                "gh",
                "pr",
                "comment",
                str(pr_number),
                "--body",
                comment,
                "--repo",
                repo,
            ],
            env={**os.environ, "GH_TOKEN": github_token},
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"Error posting comment: {e}", file=sys.stderr)


def approve_pr(pr_number: int):
    """Approve the PR."""
    github_token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")

    if not github_token or not repo:
        return

    try:
        subprocess.run(
            [
                "gh",
                "pr",
                "review",
                str(pr_number),
                "--approve",
                "--body",
                "✅ Code review passed",
                "--repo",
                repo,
            ],
            env={**os.environ, "GH_TOKEN": github_token},
            check=True,
        )
        print(f"PR #{pr_number} approved by Claude")
    except subprocess.CalledProcessError as e:
        print(f"Error approving PR: {e}", file=sys.stderr)


def main():
    pr_number = os.getenv("PR_NUMBER")
    pr_title = os.getenv("PR_TITLE")

    if not pr_number or not pr_title:
        print("Missing PR information")
        return

    print(f"Reviewing PR #{pr_number}: {pr_title}")

    try:
        # Get the diff
        diff = get_pr_diff()

        if not diff:
            print("No diff found. Skipping review.")
            return

        # Review with Claude
        print("Running Claude review...")
        approved, review_comment = review_code_with_claude(diff, pr_title)

        # Post comment
        print("Posting review comment...")
        post_review_comment(int(pr_number), review_comment)

        # Approve if passed
        if approved:
            print("Code review passed! Approving PR...")
            approve_pr(int(pr_number))
        else:
            print("Code review did not pass. PR requires manual review.")

        print("Done!")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
