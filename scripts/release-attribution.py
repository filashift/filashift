#!/usr/bin/env python3
"""Create and verify FilaShift maintainer release commits; never rewrites history."""
import argparse
import os
import re
import subprocess
import sys

NAME = "David Jackson"
EMAIL = "dgjackson05@gmail.com"
TRAILER = "Co-authored-by: Perplexity <noreply@perplexity.ai>"


def git(*args, **kwargs):
    return subprocess.check_output(["git", *args], text=True, **kwargs).rstrip("\n")


def verify(ref):
    sha = git("rev-parse", "--verify", "--end-of-options", ref + "^{commit}")
    # Lowercase placeholders return the raw identities, not .mailmap aliases.
    an, ae, cn, ce, body = git("show", "-s", "--format=%an%x00%ae%x00%cn%x00%ce%x00%B", sha).split("\0", 4)
    if (an, ae, cn, ce) != (NAME, EMAIL, NAME, EMAIL):
        raise ValueError(f"{sha}: unexpected author or committer: {an} <{ae}> / {cn} <{ce}>")
    parsed = git("interpret-trailers", "--parse", input=body + "\n").splitlines()
    if (not parsed or parsed[-1] != TRAILER or body.splitlines()[-1:] != [TRAILER]
            or len(re.findall(r"(?im)^co-authored-by\s*:[^\n]*<noreply@perplexity\.ai>\s*$", body)) != 1):
        raise ValueError(f"{sha}: expected exactly one final '{TRAILER}' trailer")
    print(f"Verified {sha}: author and committer {NAME} <{EMAIL}>; final co-author trailer OK.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    create = commands.add_parser("commit", help="Commit only already-staged changes")
    create.add_argument("subject")
    create.add_argument("--body", default="")
    commands.add_parser("verify").add_argument("ref", nargs="?", default="HEAD")
    args = parser.parse_args()
    if args.action == "verify":
        return verify(args.ref)
    if not args.subject.strip() or "\n" in args.subject:
        parser.error("Use a one-line subject and optional --body.")
    if "noreply@perplexity.ai" in (args.subject + args.body).lower():
        parser.error("The helper adds the Perplexity trailer; do not supply it.")
    env = os.environ.copy()
    for role in ("AUTHOR", "COMMITTER"):
        env.update({f"GIT_{role}_NAME": NAME, f"GIT_{role}_EMAIL": EMAIL})
    message = "\n\n".join(part for part in (args.subject.strip(), args.body.strip(), TRAILER) if part) + "\n"
    subprocess.run(["git", "commit", "--cleanup=verbatim", "-F", "-"], input=message, text=True, env=env, check=True)
    verify("HEAD")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        sys.exit(str(exc))
