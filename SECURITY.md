# Security Policy

## Reporting a vulnerability

If you find a security problem — in the CLI/MCP server, or a registry listing that is malicious, mislabeled, or bypassing validation — please report it **privately** to Rene Turcios via GitHub (@CloudCorpRecords, private vulnerability report on this repo) rather than opening a public issue. Confirmed-bad listings are pulled first and discussed second.

Please include: the listing slug or component, the exact file(s) or command involved, and what the checks missed. Reports are acknowledged as fast as a solo maintainer honestly can.

## Supported versions

Only the latest release is supported. The registry format (docs/SPEC.md) is versioned; validators reject what they do not understand rather than guessing.

## The safety model in one paragraph

Listings may contain only allowlisted inert media, text, and JSON — never executables or scripts. Every file's sha256 and size are recorded in its manifest, verified on validation and twice on install, and path-traversal entries are rejected. `vetted` status is granted by a reviewer who ran the VETTING.md checklist, never self-asserted. See docs/VETTING.md for the full model and its limits.
