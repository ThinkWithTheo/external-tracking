# Coding Standards - Standard Operating Procedure

## Overview
This document defines the coding standards, best practices, and procedures for all development work. These standards ensure consistency, maintainability, and AI-friendly code across all projects.

## Scope
Applies to all code development, documentation, and version control practices across all projects and programming languages.

## Prerequisites
- Basic understanding of version control (Git)
- Access to project repository
- Familiarity with chosen development tools and IDEs

## General Coding Standards

### Code Quality
- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Use consistent indentation and formatting
- Remove commented-out code before committing
- Avoid deep nesting (max 3-4 levels)

### Documentation Standards
- Include docstrings/comments for all public functions and classes
- Document complex business logic and algorithms
- Keep comments up-to-date with code changes
- Use clear, concise language in documentation

## Documenting Known Issues

### When to Document
Document known issues when:
- A bug has been identified and temporarily worked around
- Code appears unusual but is necessary due to external constraints
- A solution looks "wrong" but is required for specific technical reasons

### How to Document
```python
# KNOWN ISSUE: This function looks inefficient but is required due to 
# API rate limiting constraints. See GitHub issue #123 for details.
# TODO: Refactor when new API version is available (Q2 2025)
def workaround_function():
    # Implementation here
    pass
```

### Documentation Format
- Use `# KNOWN ISSUE:` prefix for temporary workarounds
- Include reference to GitHub issue or ticket number
- Add `TODO:` with timeline if applicable
- Explain the business/technical reason for the approach

## Unit Testing Standards

### When to Write Tests
- All new functions and classes require unit tests
- Bug fixes must include regression tests
- Critical business logic requires comprehensive test coverage
- API endpoints require integration tests

### Testing Framework Standards
- **Python**: Use `pytest` as the standard testing framework
- **JavaScript/TypeScript**: Use Jest or Vitest
- **Other languages**: Follow language-specific best practices

### Test Structure
```python
def test_function_name_should_expected_behavior():
    # Arrange
    input_data = setup_test_data()
    
    # Act
    result = function_under_test(input_data)
    
    # Assert
    assert result == expected_output
```

## Version Control Standards

### Branch Management
- **Main Branch**: Always deployable, protected branch
- **Feature Branches**: `feature/description-of-feature`
- **Bug Fix Branches**: `fix/description-of-fix`
- **Hotfix Branches**: `hotfix/critical-issue-description`

### Commit Standards
- Use clear, descriptive commit messages
- Start with action verb (Add, Fix, Update, Remove)
- Keep first line under 50 characters
- Include detailed description if needed

```
Add user authentication middleware

- Implement JWT token validation
- Add role-based access control
- Include error handling for expired tokens
```

### Before Pushing to GitHub
1. **Rebase on Main**: Always rebase your branch on the latest main
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run Tests**: Ensure all tests pass locally
   ```bash
   npm test  # or pytest, etc.
   ```

3. **Code Review**: Create pull request for peer review
4. **Clean Up**: Remove any temporary files or working documents

## Security Standards

### Sensitive Information
- **Never commit**: API keys, passwords, tokens, or credentials
- **Use Environment Variables**: Store sensitive data in `.env` files
- **Git Ignore**: Always include `.env` in `.gitignore`
- **Secrets Management**: Use proper secrets management tools in production

### Environment Variables
```bash
# .env file structure
DATABASE_URL=your_database_url
API_KEY=your_api_key
SECRET_KEY=your_secret_key
```

## AI Development Guidelines

### Context Window Management
- Keep documentation concise but complete
- Use clear section headers for easy navigation
- Include relevant file paths and line numbers in comments
- Structure code for easy AI comprehension

### Prompt-Friendly Documentation
- Include system overview in README (≤500 lines)
- Reference available tools and MCPs in project documentation
- Use consistent terminology throughout the project
- Provide clear examples and use cases

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Merge conflicts during rebase | Outdated local branch | `git fetch origin && git rebase origin/main` |
| Tests failing after merge | Dependencies out of sync | `npm install` or `pip install -r requirements.txt` |
| Sensitive data in commit history | Accidental commit | Use `git filter-branch` or contact team lead |
| Code style inconsistencies | No formatter configured | Set up Prettier, Black, or language-specific formatter |

## References
- [Git Best Practices](https://git-scm.com/book)
- [Clean Code Principles](https://clean-code-developer.com/)
- Project-specific style guides in `/docs/System/`

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-02 | 1.0 | Initial creation based on team discussion | Team |

---
*This document should be included in the context window for all AI development sessions.*