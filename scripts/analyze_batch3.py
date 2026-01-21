#!/usr/bin/env python3
"""Analyze marketplaces 651-975 and generate category descriptions."""

import json
import re

def analyze_marketplace(m, idx):
    """Analyze a single marketplace and return structured analysis."""
    repo = m.get('repo', '')
    name = m.get('name', '')
    desc = m.get('description', '')
    plugins = m.get('plugins', [])

    # Collect all text for analysis
    all_info = []
    plugin_names = []
    skill_names = []
    command_names = []

    if desc:
        all_info.append(desc)

    for p in plugins:
        if p.get('name'):
            plugin_names.append(p.get('name'))
        if p.get('description'):
            all_info.append(p.get('description'))
        for s in p.get('skills', []):
            if s.get('name'):
                skill_names.append(s.get('name'))
            if s.get('description'):
                all_info.append(s.get('description'))
        for c in p.get('commands', []):
            if c.get('name'):
                command_names.append(c.get('name'))
            if c.get('description'):
                all_info.append(c.get('description'))

    combined = ' '.join(all_info).lower()
    all_names = ' '.join(plugin_names + skill_names + command_names).lower()

    # Initialize result
    result = {
        "repo": repo,
        "function": None,
        "value": None,
        "stage_lifecycle_arch": [],
        "integration": None
    }

    # Detect integration/framework
    integration = detect_integration(combined, all_names, repo)

    # Detect lifecycle tags
    tags = detect_tags(combined, all_names)

    # Generate function and value descriptions
    func, value = generate_descriptions(m, combined, integration, tags)

    result['function'] = func
    result['value'] = value
    result['stage_lifecycle_arch'] = sorted(list(tags)) if tags else ['general']
    result['integration'] = integration

    return result


def detect_integration(combined, all_names, repo):
    """Detect framework/service integration."""
    # Check in order of specificity
    integrations = [
        # Specific frameworks/tools first
        ('holoviz', 'HoloViz'),
        ('treasure data', 'Treasure Data'),
        ('home assistant', 'Home Assistant'),
        ('esphome', 'ESPHome'),
        ('graphpad prism', 'GraphPad Prism'),
        ('redpanda connect', 'Redpanda Connect'),
        ('shesha', 'Shesha Framework'),
        ('microsoft 365', 'Microsoft 365'),
        ('m365', 'Microsoft 365'),
        ('google workspace', 'Google Workspace'),
        ('twenty crm', 'Twenty CRM'),
        ('makerkit', 'MakerKit'),
        ('dojo', 'Dojo/Starknet'),
        ('starknet', 'Dojo/Starknet'),
        ('shioaji', 'Shioaji'),
        ('frappe', 'Frappe/ERPNext'),
        ('erpnext', 'Frappe/ERPNext'),
        ('maui blazor', '.NET MAUI Blazor'),
        ('nette', 'Nette Framework'),
        ('composable architecture', 'Swift/TCA'),
        ('tca', 'Swift/TCA'),
        ('webviewbridge', 'Swift/WebKit'),
        ('langroid', 'Langroid'),
        ('langchain', 'LangChain'),
        ('dspy', 'DSPy'),
        ('insforge', 'InsForge'),

        # Cloud/DevOps
        ('cloudflare worker', 'Cloudflare Workers'),
        ('railway', 'Railway'),
        ('vercel', 'Vercel'),
        ('hetzner', 'Hetzner'),
        ('kubernetes', 'Kubernetes'),
        ('k8s', 'Kubernetes'),
        ('terraform', 'Terraform'),
        ('docker', 'Docker'),
        ('github action', 'GitHub Actions'),
        ('buildkite', 'Buildkite'),
        ('gitlab', 'GitLab'),
        ('azure devops', 'Azure DevOps'),

        # Cloud providers
        ('aws', 'AWS'),
        ('azure', 'Azure'),
        ('gcp', 'GCP'),
        ('google cloud', 'GCP'),

        # Databases
        ('supabase', 'Supabase'),
        ('firebase', 'Firebase'),
        ('postgresql', 'PostgreSQL'),
        ('postgres', 'PostgreSQL'),
        ('mysql', 'MySQL'),
        ('mongodb', 'MongoDB'),
        ('redis', 'Redis'),
        ('neo4j', 'Neo4j'),
        ('duckdb', 'DuckDB'),
        ('drizzle', 'Drizzle ORM'),
        ('prisma', 'Prisma'),
        ('sqlalchemy', 'SQLAlchemy'),
        ('sql server', 'SQL Server'),
        ('tsqlt', 'SQL Server'),
        ('cool-mysql', 'MySQL'),

        # Frontend frameworks
        ('next.js', 'Next.js'),
        ('nextjs', 'Next.js'),
        ('nuxt', 'Nuxt'),
        ('svelte', 'Svelte'),
        ('angular', 'Angular'),
        ('vue', 'Vue'),
        ('react native', 'React Native'),
        ('expo', 'Expo'),
        ('flutter', 'Flutter'),
        ('tanstack', 'TanStack'),
        ('taro', 'Taro'),

        # Backend frameworks
        ('django', 'Django'),
        ('fastapi', 'FastAPI'),
        ('spring boot', 'Spring Boot'),
        ('springboot', 'Spring Boot'),
        ('laravel', 'Laravel'),
        ('laravel forge', 'Laravel Forge'),
        ('ruby on rails', 'Ruby on Rails'),
        ('rails', 'Ruby on Rails'),
        ('go gin', 'Go Gin'),
        ('gin framework', 'Go Gin'),
        ('go echo', 'Go Echo'),
        ('echo framework', 'Go Echo'),
        ('hono', 'Hono'),
        ('axum', 'Rust Axum'),
        ('asp.net', 'ASP.NET'),

        # Languages
        ('elixir', 'Elixir'),
        ('phoenix', 'Elixir/Phoenix'),
        ('haskell', 'Haskell'),
        ('hoogle', 'Haskell'),
        ('julia', 'Julia'),
        ('elm', 'Elm'),
        ('dart', 'Dart'),
        ('rust', 'Rust'),
        ('golang', 'Go'),

        # Game engines
        ('godot', 'Godot'),
        ('unity', 'Unity'),
        ('unreal', 'Unreal'),

        # Tools
        ('ida pro', 'IDA Pro'),
        ('idapython', 'IDA Pro'),
        ('obsidian', 'Obsidian'),
        ('notion', 'Notion'),
        ('slack', 'Slack'),
        ('jira', 'Jira'),
        ('linear', 'Linear'),
        ('playwright', 'Playwright'),
        ('xcode', 'Xcode'),
        ('iterm', 'iTerm2'),
        ('tmux', 'tmux'),
        ('zellij', 'Zellij'),
        ('whisper', 'Whisper'),
        ('browserbase', 'Browserbase'),

        # APIs/Services
        ('stripe', 'Stripe'),
        ('plaid', 'Plaid'),
        ('auth0', 'Auth0'),
        ('posthog', 'PostHog'),
        ('sentry', 'Sentry'),
        ('bugsnag', 'Bugsnag'),
        ('prometheus', 'Prometheus'),
        ('tavily', 'Tavily'),
        ('brevo', 'Brevo'),
        ('salesforce', 'Salesforce'),
        ('graphql', 'GraphQL'),
        ('openapi', 'OpenAPI'),

        # AI/ML
        ('openai', 'OpenAI'),
        ('gemini', 'Google Gemini'),
        ('anthropic', 'Anthropic'),
        ('ollama', 'Ollama'),
        ('mlx', 'MLX'),
        ('pytorch', 'PyTorch'),
        ('transformers', 'Transformers'),
        ('modal', 'Modal'),
        ('olakai', 'Olakai'),

        # Blockchain
        ('aptos', 'Aptos'),
        ('walrus', 'Walrus'),
        ('shelby', 'Shelby/Aptos'),
        ('web3', 'Web3'),
        ('blockchain', 'Blockchain'),

        # CMS/Content
        ('wechat', 'WeChat'),
        ('ia writer', 'iA Writer'),

        # Specific tools in repo names
        ('polars', 'Polars'),
        ('oxlint', 'Oxlint'),
        ('marksman', 'Marksman'),
    ]

    for keyword, name in integrations:
        if keyword in combined or keyword in repo.lower():
            return name

    # Check for React last (common word)
    if 'react' in combined and 'native' not in combined and 'reactive' not in combined:
        return 'React'

    # Python is generic
    if 'python' in combined and not any(x in combined for x in ['django', 'fastapi', 'flask']):
        return 'Python'

    # TypeScript is generic
    if 'typescript' in combined:
        return 'TypeScript'

    # .NET
    if '.net' in combined or 'dotnet' in combined:
        return '.NET'

    # Go
    if ' go ' in combined or combined.startswith('go ') or 'golang' in combined:
        return 'Go'

    # Swift
    if 'swift' in combined and 'swiftui' not in combined:
        return 'Swift'

    return None


def detect_tags(combined, all_names):
    """Detect lifecycle and architecture tags."""
    tags = set()

    tag_patterns = [
        # Lifecycle stages
        (r'\b(plan|planning|spec|specification|requirement|prd|roadmap)\b', 'planning'),
        (r'\b(design|architect|uml|diagram|blueprint|wireframe)\b', 'design'),
        (r'\b(implement|develop|code|build|scaffold|generate)\b', 'implementation'),
        (r'\b(test|tdd|bdd|unit test|e2e|playwright|jest|pytest)\b', 'testing'),
        (r'\b(deploy|ci/cd|release|ship|publish|pipeline)\b', 'deployment'),
        (r'\b(monitor|observ|metric|telemetry|trace|log)\b', 'monitoring'),
        (r'\b(debug|troubleshoot|diagnos|fix|error)\b', 'debugging'),
        (r'\b(document|doc|readme|changelog|wiki)\b', 'documentation'),
        (r'\b(review|pr review|code review|audit)\b', 'code-review'),

        # Architecture patterns
        (r'\b(context|memory|session|persist|state)\b', 'context-management'),
        (r'\b(orchestrat|multi-agent|workflow|pipeline|coordinate)\b', 'orchestration'),
        (r'\b(frontend|ui|component|css|style|tailwind)\b', 'frontend'),
        (r'\b(backend|api|server|endpoint|rest|graphql)\b', 'backend'),
        (r'\b(database|sql|migration|schema|orm|query)\b', 'database'),
        (r'\b(devops|infrastructure|cloud|container|k8s)\b', 'devops'),
        (r'\b(security|auth|oauth|vulnerability|encrypt|permission)\b', 'security'),
        (r'\b(git|commit|branch|merge|rebase|pr|pull request)\b', 'version-control'),
        (r'\b(refactor|clean|simplif|reorganize)\b', 'refactoring'),
        (r'\b(research|analys|investigat|explor)\b', 'research'),

        # Domain areas
        (r'\b(visual|dashboard|chart|graph|plot)\b', 'data-visualization'),
        (r'\b(data process|transform|etl|pipeline|ingest)\b', 'data-processing'),
        (r'\b(mobile|ios|android|app store)\b', 'mobile'),
        (r'\b(game|unity|godot|unreal)\b', 'game-development'),
        (r'\b(llm|machine learning|ml|ai agent|prompt)\b', 'ai-ml'),
        (r'\b(prompt engineer|prompt optim)\b', 'prompt-engineering'),
        (r'\b(plugin develop|skill creat|marketplace)\b', 'plugin-development'),
        (r'\b(incident|root cause|postmortem|sre)\b', 'incident-response'),
        (r'\b(notification|alert|webhook|sound)\b', 'notifications'),
        (r'\b(project manage|task|issue|ticket|backlog|sprint)\b', 'project-management'),
        (r'\b(content|write|blog|article|copy)\b', 'content-creation'),
        (r'\b(translate|i18n|localization|language)\b', 'localization'),
        (r'\b(accessibility|a11y|wcag)\b', 'accessibility'),
        (r'\b(performance|optim|speed|cache)\b', 'performance'),
        (r'\b(reverse engineer|binary|decompile|disassembl)\b', 'reverse-engineering'),
        (r'\b(crypto|trading|defi|finance|payment)\b', 'fintech'),
        (r'\b(crm|customer|lead|sales)\b', 'crm'),
        (r'\b(marketing|seo|campaign|analytics)\b', 'marketing'),
        (r'\b(lsp|language server)\b', 'language-server'),
        (r'\b(format|lint|prettier|eslint|style)\b', 'code-quality'),
        (r'\b(type check|type signature|rbs|sorbet)\b', 'type-checking'),
        (r'\b(ddd|domain.driven|bounded context)\b', 'domain-driven-design'),
        (r'\b(tdd|test.driven)\b', 'test-driven-development'),
    ]

    for pattern, tag in tag_patterns:
        if re.search(pattern, combined):
            tags.add(tag)

    return tags


def generate_descriptions(m, combined, integration, tags):
    """Generate function and value descriptions based on analysis."""
    desc = m.get('description', '')
    plugins = m.get('plugins', [])
    repo = m.get('repo', '')

    # Get first meaningful plugin description
    plugin_desc = None
    for p in plugins:
        if p.get('description'):
            plugin_desc = p.get('description')
            break

    # Handle null/empty descriptions
    if not desc and not plugin_desc:
        # Try to infer from repo name and plugin names
        plugin_names = [p.get('name', '') for p in plugins]
        if not plugin_names:
            return None, None

        # Make educated guesses based on common patterns
        repo_lower = repo.lower()
        names_combined = ' '.join(plugin_names).lower()

        if 'git' in names_combined or 'commit' in names_combined:
            return "Automate git workflows including commits, branches, and pull requests.", "Streamline version control with consistent, well-formatted commits."
        if 'review' in names_combined:
            return "Review code changes and provide feedback.", "Catch issues early with automated code review."
        if 'test' in names_combined:
            return "Generate and run tests for code.", "Ensure code quality with comprehensive test coverage."

        return None, None

    # Use description to generate function
    source = desc if desc else plugin_desc

    # Generate function based on content analysis
    func = None
    value = None

    # Data visualization (check first - more specific)
    if 'visualization' in combined or 'holoviz' in combined or ('dashboard' in combined and 'data' in combined):
        func = "Build interactive data visualizations and dashboards."
        value = "Create publication-quality visualizations with less code."

    # API documentation
    elif 'api' in combined and ('document' in combined or 'endpoint' in combined) and 'visual' not in combined:
        func = "Document and explore REST API endpoints through testing and analysis."
        value = "Understand and document APIs quickly without manual exploration."

    # More dashboard types
    elif 'dashboard' in combined:
        func = "Build interactive data visualizations and dashboards."
        value = "Create publication-quality visualizations with less code."

    # Root cause analysis
    elif 'root cause' in combined or 'incident' in combined:
        func = "Investigate production incidents and identify root causes."
        value = "Reduce mean time to resolution with systematic debugging."

    # Multi-agent orchestration
    elif 'multi-agent' in combined or 'orchestrat' in combined:
        func = "Coordinate multiple AI agents to complete complex tasks."
        value = "Break down large problems into parallel workstreams."

    # Session/context management
    elif 'session' in combined and ('context' in combined or 'memory' in combined or 'analytics' in combined):
        func = "Track and manage session state, context, and analytics."
        value = "Maintain continuity across conversations and optimize performance."

    # Spec-driven development
    elif 'spec' in combined and ('driven' in combined or 'workflow' in combined):
        func = "Follow specification-driven development with planning, design, and implementation phases."
        value = "Build software systematically with clear requirements and traceability."

    # TDD/Testing
    elif 'tdd' in combined or 'test-driven' in combined:
        func = "Implement features using test-driven development methodology."
        value = "Write reliable code with comprehensive test coverage from the start."

    # Git workflows
    elif 'git' in combined and ('commit' in combined or 'workflow' in combined or 'pr' in combined):
        func = "Automate git workflows including commits, branches, and pull requests."
        value = "Maintain clean git history with consistent commit conventions."

    # Code review
    elif 'code review' in combined or 'pr review' in combined:
        func = "Review code changes and provide feedback on quality, security, and best practices."
        value = "Catch bugs and improve code quality before merging."

    # Plugin/skill development
    elif 'plugin' in combined and ('develop' in combined or 'create' in combined or 'build' in combined):
        func = "Create and manage Claude Code plugins, skills, and commands."
        value = "Extend Claude Code with custom functionality tailored to your workflow."

    # Documentation
    elif 'document' in combined or 'changelog' in combined or 'readme' in combined:
        func = "Generate and maintain project documentation including READMEs and changelogs."
        value = "Keep documentation up-to-date with minimal manual effort."

    # Framework-specific development
    elif integration:
        if integration == 'Flutter':
            func = "Build and review Flutter/Dart applications with best practices."
            value = "Develop cross-platform mobile apps faster with expert guidance."
        elif integration == 'Django':
            func = "Develop Django applications following best practices and patterns."
            value = "Build robust Python web applications with proper architecture."
        elif integration == 'Next.js':
            func = "Build Next.js applications with React, routing, and server components."
            value = "Create production-ready React applications with modern patterns."
        elif integration == 'Spring Boot':
            func = "Develop Spring Boot applications with proper architecture and patterns."
            value = "Build enterprise Java applications following best practices."
        elif integration == 'Godot':
            func = "Develop, test, and deploy Godot game projects."
            value = "Accelerate game development with automated testing and deployment."
        elif integration == 'IDA Pro':
            func = "Analyze binaries and automate reverse engineering tasks in IDA Pro."
            value = "Accelerate security research with automated binary analysis."
        elif integration == 'Supabase':
            func = "Build applications with Supabase for database, auth, and storage."
            value = "Develop full-stack apps quickly with managed backend services."
        elif integration == 'Jira':
            func = "Manage Jira issues, sprints, and workflows."
            value = "Streamline project management with automated Jira operations."
        elif integration == 'Linear':
            func = "Manage Linear issues and development workflows."
            value = "Keep development in sync with project management."
        elif integration == 'Home Assistant':
            func = "Create Home Assistant automations, scripts, and ESPHome configurations."
            value = "Build smart home integrations with expert guidance."
        elif integration == 'Obsidian':
            func = "Manage Obsidian vaults including notes, links, and organization."
            value = "Keep your knowledge base organized and interconnected."
        elif integration == 'Salesforce':
            func = "Develop Salesforce applications including Apex, Flows, and metadata."
            value = "Build and maintain Salesforce customizations efficiently."
        elif integration in ['Go', 'Go Gin', 'Go Echo']:
            func = "Develop Go applications with proper patterns and best practices."
            value = "Write idiomatic, performant Go code."
        elif integration == 'Rust':
            func = "Develop Rust applications with proper patterns and error handling."
            value = "Write safe, efficient Rust code."
        elif integration == 'Elixir/Phoenix':
            func = "Design and build Elixir/Phoenix applications with OTP patterns."
            value = "Create scalable, fault-tolerant systems."
        elif integration == 'Laravel':
            func = "Develop Laravel applications with proper patterns and conventions."
            value = "Build PHP applications following Laravel best practices."
        elif integration == 'Expo':
            func = "Build and deploy Expo/React Native mobile applications."
            value = "Ship mobile apps faster with streamlined development workflows."
        elif integration in ['AWS', 'Azure', 'GCP']:
            func = f"Deploy and manage cloud infrastructure on {integration}."
            value = "Automate cloud operations with infrastructure as code."
        elif integration == 'Kubernetes':
            func = "Deploy and manage Kubernetes applications and configurations."
            value = "Simplify container orchestration and deployment."
        elif integration == 'Docker':
            func = "Build and manage Docker containers and development environments."
            value = "Standardize development and deployment with containers."
        elif integration == 'Playwright':
            func = "Automate browser testing and web scraping with Playwright."
            value = "Test web applications reliably across browsers."
        elif integration == 'GraphQL':
            func = "Design and implement GraphQL APIs and schemas."
            value = "Build flexible, efficient APIs with GraphQL."
        elif integration == 'Stripe':
            func = "Integrate Stripe payments, subscriptions, and webhooks."
            value = "Add payment processing to applications quickly."
        elif integration == 'PostHog':
            func = "Manage PostHog feature flags, analytics, and user tracking."
            value = "Make data-driven decisions with product analytics."
        elif integration == 'Sentry':
            func = "Debug application errors using Sentry error tracking."
            value = "Identify and fix bugs faster with error context."
        elif integration == 'Notion':
            func = "Manage and automate Notion workspaces and knowledge bases."
            value = "Keep documentation and knowledge organized."
        elif integration == 'Slack':
            func = "Search and interact with Slack workspaces and channels."
            value = "Find information and automate Slack workflows."
        elif integration == 'Google Gemini':
            func = "Generate images and content using Google Gemini APIs."
            value = "Create AI-generated assets for applications."
        elif integration == 'LangChain':
            func = "Build AI agents and workflows using LangChain."
            value = "Create sophisticated AI applications with modular components."
        elif integration == 'Web3':
            func = "Develop Web3 and blockchain applications."
            value = "Build decentralized applications with proper patterns."
        elif integration == 'WeChat':
            func = "Create WeChat Mini Programs and official account content."
            value = "Reach users on China's dominant messaging platform."
        else:
            func = f"Develop {integration} applications with best practices and patterns."
            value = f"Build quality {integration} projects faster."

    # Autonomous development
    elif 'autonomous' in combined or 'autopilot' in combined or 'ralph' in combined:
        func = "Run autonomous development loops that iterate until task completion."
        value = "Let AI handle repetitive development tasks independently."

    # Research/analysis
    elif 'research' in combined and ('deep' in combined or 'web' in combined):
        func = "Conduct deep research using web search and source analysis."
        value = "Get comprehensive, verified answers to complex questions."

    # Notifications
    elif 'notification' in combined or 'alert' in combined or 'sound' in combined:
        func = "Send notifications when Claude completes tasks or needs input."
        value = "Stay informed without watching the terminal."

    # DDD
    elif 'domain-driven' in combined or 'ddd' in combined or 'bounded context' in combined:
        func = "Apply Domain-Driven Design principles to software architecture."
        value = "Build maintainable systems aligned with business domains."

    # Security
    elif 'security' in combined and ('audit' in combined or 'review' in combined or 'scan' in combined):
        func = "Audit code for security vulnerabilities and compliance issues."
        value = "Identify security risks before they reach production."

    # Default: use source description with light editing
    else:
        if source:
            # Clean up and truncate - handle different languages
            import re

            # If description is very short after splitting at first period, use full description
            first_sentence = source.split('.')[0].strip()
            if len(first_sentence) < 10 and len(source) > 20:
                # Use the full description or first Chinese sentence
                match = re.match(r'^(.+?[。！？])', source)
                if match:
                    func = match.group(1).strip()
                else:
                    func = source.strip()
            else:
                # Match first sentence (handles . ! ? and Chinese punctuation)
                match = re.match(r'^([^.!?。！？]+[.!?。！？]?)', source)
                if match:
                    func = match.group(1).strip()
                else:
                    func = source.strip()

            if len(func) > 150:
                func = func[:147] + '...'
            if func and not func[-1] in '.!?。！？':
                func = func + '.'

            # Generate value from context
            if 'productivity' in combined or 'workflow' in combined:
                value = "Improve development productivity with automated workflows."
            elif 'quality' in combined:
                value = "Maintain high code quality with consistent standards."
            elif 'speed' in combined or 'fast' in combined:
                value = "Complete development tasks faster."
            elif 'learn' in combined or 'teach' in combined:
                value = "Learn and improve development skills."
            else:
                value = "Streamline development workflows and reduce manual effort."
        else:
            return None, None

    return func, value


def main():
    # Read input data
    with open('/tmp/marketplace-batch-3.json', 'r') as f:
        data = json.load(f)

    print(f"Analyzing {len(data)} marketplaces...")

    results = []
    for i, m in enumerate(data):
        result = analyze_marketplace(m, 651 + i)
        results.append(result)

        if (i + 1) % 50 == 0:
            print(f"Processed {i + 1}/{len(data)}")

    # Save results
    output_path = '/Users/brsbl/Documents/agent-mart/data/marketplace-analysis-batch-3.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"Saved {len(results)} analyses to {output_path}")

    # Print summary stats
    with_func = sum(1 for r in results if r['function'])
    with_integration = sum(1 for r in results if r['integration'])
    print(f"With function: {with_func}/{len(results)}")
    print(f"With integration: {with_integration}/{len(results)}")


if __name__ == '__main__':
    main()
