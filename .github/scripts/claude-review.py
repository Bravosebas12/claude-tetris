#!/usr/bin/env python3
"""
Claude Code Review via AWS Bedrock with Bearer Token.
Analyzes PR diffs and generates code review feedback using Claude on AWS Bedrock.
"""

import os
import json
import subprocess
import sys
import requests
from pathlib import Path


def get_pr_diff():
    """Get the diff of the current PR."""
    try:
        # Get the base branch (usually main or master)
        result = subprocess.run(
            ["git", "diff", "origin/main...HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            # Fallback to master if main doesn't exist
            result = subprocess.run(
                ["git", "diff", "origin/master...HEAD"],
                capture_output=True,
                text=True,
                check=False,
            )
        return result.stdout
    except Exception as e:
        print(f"Error getting diff: {e}", file=sys.stderr)
        return ""


def get_changed_files():
    """Get list of changed files in the PR."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "origin/main...HEAD"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            result = subprocess.run(
                ["git", "diff", "--name-only", "origin/master...HEAD"],
                capture_output=True,
                text=True,
                check=False,
            )
        return result.stdout.strip().split("\n") if result.stdout.strip() else []
    except Exception as e:
        print(f"Error getting changed files: {e}", file=sys.stderr)
        return []


def analyze_with_claude(diff: str, files: list[str]) -> str:
    """
    Send the diff to Claude on Bedrock for analysis using Bearer Token.

    Environment variables required:
    - AWS_BEARER_TOKEN (Bearer Token from AWS)
    - AWS_REGION (defaults to us-east-1)
    """
    bearer_token = os.getenv("AWS_BEARER_TOKEN")
    aws_region = os.getenv("AWS_REGION", "us-east-1")

    if not bearer_token:
        raise ValueError("AWS_BEARER_TOKEN environment variable is required")

    # Prepare the prompt
    files_str = "\n".join(f"- {f}" for f in files) if files else "No files changed"

    prompt = f"""You are an experienced code reviewer. Analyze the following pull request diff and provide constructive feedback.

**Changed Files:**
{files_str}

**Diff:**
```
{diff}
```

Please provide:
1. **Issues Found** - Any bugs, security issues, or problems
2. **Improvements** - Suggestions for code quality, performance, or maintainability
3. **Best Practices** - Whether the code follows project conventions
4. **Summary** - Brief overall assessment

Be specific and actionable. Format your response in markdown."""

    # Bedrock API endpoint
    url = f"https://bedrock-runtime.{aws_region}.amazonaws.com/model/anthropic.claude-opus-5/invoke"

    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
    }

    # Prepare the request body for Bedrock
    body = {
        "anthropic_version": "bedrock-2023-06-01",
        "max_tokens": 2048,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    # Call Bedrock API
    response = requests.post(url, json=body, headers=headers, timeout=30)

    if response.status_code != 200:
        error_msg = response.text
        raise RuntimeError(f"Bedrock API error: {response.status_code} - {error_msg}")

    # Parse response
    result = response.json()
    response_text = ""

    if "content" in result:
        for block in result["content"]:
            if block.get("type") == "text":
                response_text += block.get("text", "")

    return response_text


def save_review_to_file(review: str, output_file: str = ".review.json"):
    """Save review results to a file for the post-comment script."""
    data = {
        "review": review,
        "pr_number": os.getenv("PR_NUMBER"),
    }

    with open(output_file, "w") as f:
        json.dump(data, f)

    print(f"Review saved to {output_file}")


def main():
    print("Starting Claude Code Review on Bedrock...")

    # Get PR information
    diff = get_pr_diff()
    files = get_changed_files()

    if not diff:
        print("No diff found. Skipping review.")
        return

    print(f"Found {len(files)} changed files")
    print("Sending to Claude for analysis...")

    # Analyze with Claude
    review = analyze_with_claude(diff, files)

    print("Review completed!")
    print("\n" + "="*60)
    print(review)
    print("="*60 + "\n")

    # Save for post-comment script
    save_review_to_file(review)


if __name__ == "__main__":
    main()
