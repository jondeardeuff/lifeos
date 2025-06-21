#!/bin/bash

# LifeOS Background Agent Initialization Script
# Usage: ./init-agent.sh <agent-number> [agent-name]

set -e

AGENT_NUMBER=$1
AGENT_NAME=${2:-"Agent${AGENT_NUMBER}"}

if [ -z "$AGENT_NUMBER" ]; then
    echo "❌ Error: Agent number is required"
    echo "Usage: ./init-agent.sh <agent-number> [agent-name]"
    echo "Example: ./init-agent.sh 1 \"John Doe\""
    exit 1
fi

if [ "$AGENT_NUMBER" -lt 1 ] || [ "$AGENT_NUMBER" -gt 6 ]; then
    echo "❌ Error: Agent number must be between 1 and 6"
    exit 1
fi

# Define task mappings
declare -A TASK_NAMES=(
    [1]="voice-recording"
    [2]="speech-to-text" 
    [3]="advanced-tasks"
    [4]="realtime-infrastructure"
    [5]="api-gateway"
    [6]="security"
)

declare -A TASK_DESCRIPTIONS=(
    [1]="Frontend Voice Components"
    [2]="AI/ML Integration"
    [3]="Backend Data Models"
    [4]="Real-time Systems"
    [5]="Backend Infrastructure"
    [6]="Security & Compliance"
)

TASK_NAME=${TASK_NAMES[$AGENT_NUMBER]}
TASK_DESCRIPTION=${TASK_DESCRIPTIONS[$AGENT_NUMBER]}
BRANCH_NAME="feature/p0-task-${AGENT_NUMBER}-${TASK_NAME}"

echo "🚀 Initializing LifeOS Background Agent"
echo "=====================================+"
echo "👤 Agent: ${AGENT_NAME}"
echo "📋 Task: P0-TASK-${AGENT_NUMBER} - ${TASK_DESCRIPTION}"
echo "🌿 Branch: ${BRANCH_NAME}"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository. Please run this from the LifeOS root directory."
    exit 1
fi

# Check if branch exists
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "✅ Branch ${BRANCH_NAME} already exists"
else
    echo "❌ Error: Branch ${BRANCH_NAME} not found"
    echo "Please ensure you've run the git setup first"
    exit 1
fi

# Switch to agent's branch
echo "🔄 Switching to agent branch..."
git checkout "${BRANCH_NAME}"

# Configure git for the agent
echo "⚙️  Configuring git for agent..."
git config user.name "Agent ${AGENT_NUMBER} - ${AGENT_NAME}"
git config user.email "agent${AGENT_NUMBER}@lifeos.dev"

# Set up git aliases
git config alias.co checkout
git config alias.br branch  
git config alias.ci commit
git config alias.st status
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'

# Show task assignment
echo ""
echo "📖 Your Task Assignment:"
echo "========================"
echo "📄 Task File: docs/development/agent-tasks/P0-TASK-${AGENT_NUMBER}-*.md"
echo "🎯 Focus: ${TASK_DESCRIPTION}"
echo "⏱️  Timeline: See task file for details"
echo ""

# Show initial commands
echo "🏁 Getting Started:"
echo "==================="
echo ""
echo "1. Read your task specification:"
echo "   📖 open docs/development/agent-tasks/P0-TASK-${AGENT_NUMBER}-*.md"
echo ""
echo "2. Install dependencies:"
case $AGENT_NUMBER in
    1|2)
        echo "   📦 cd client && npm install"
        ;;
    3|4|5|6)
        echo "   📦 npm install"
        ;;
esac
echo ""
echo "3. Set up environment:"
echo "   🔧 cp .env.example .env"
echo "   ✏️  Edit .env with your API keys"
echo ""
echo "4. Start development:"
case $AGENT_NUMBER in
    1)
        echo "   🚀 cd client && npm run dev"
        echo "   🧪 npm run test:voice"
        ;;
    2)
        echo "   🚀 npm run dev:server"
        echo "   🧪 npm run test:speech"
        ;;
    3)
        echo "   🚀 npx prisma migrate dev"
        echo "   🧪 npm run test:models"
        ;;
    4)
        echo "   🚀 npm run dev:realtime"
        echo "   🧪 npm run test:realtime"
        ;;
    5)
        echo "   🚀 npm run dev:server"
        echo "   🧪 npm run test:api-gateway"
        ;;
    6)
        echo "   🚀 npm run dev:server"
        echo "   🧪 npm run test:security"
        ;;
esac
echo ""
echo "5. Daily workflow:"
echo "   🔄 git fetch origin && git merge origin/develop"
echo "   💻 [work on your tasks]"
echo "   💾 git add . && git commit -m \"feat(task-${AGENT_NUMBER}): description\""
echo "   📤 git push origin ${BRANCH_NAME}"
echo ""

# Show dependencies
echo "🔗 Dependencies:"
echo "==============="
case $AGENT_NUMBER in
    1)
        echo "   ✅ No dependencies - you can start immediately!"
        ;;
    2)
        echo "   ⏳ Depends on: Agent 1 (Voice Recording)"
        echo "   📞 Coordinate with Agent 1 for audio blob handoff"
        ;;
    3)
        echo "   ✅ Can start immediately with basic setup"
        echo "   🤝 Coordinates with Agent 4 for real-time updates"
        ;;
    4)
        echo "   ⏳ Depends on: Agent 3 basic models"
        echo "   📞 Coordinate with Agent 3 for task update events"
        ;;
    5)
        echo "   ✅ Can start immediately with existing GraphQL API"
        echo "   🤝 Provides foundation for Agent 6"
        ;;
    6)
        echo "   ⏳ Integrates with: Agent 5 (API Gateway)"
        echo "   📞 Coordinate with Agent 5 for security middleware"
        ;;
esac
echo ""

# Show success criteria
echo "🎯 Success Criteria:"
echo "==================="
echo "   ✅ Complete all 8 subtasks in your task file"
echo "   ✅ Achieve >80% test coverage"
echo "   ✅ Meet performance benchmarks"
echo "   ✅ Pass integration tests"
echo "   ✅ Document your implementation"
echo ""

# Show communication
echo "📞 Communication:"
echo "================="
echo "   💬 Daily standup: 9:00 AM (coordinate time zones)"
echo "   🚨 Report blockers immediately"
echo "   🤝 Coordinate with dependent agents"
echo "   📝 Use PR template for integration"
echo ""

echo "🎉 Agent ${AGENT_NUMBER} (${AGENT_NAME}) successfully initialized!"
echo "📋 You're now ready to start working on ${TASK_DESCRIPTION}"
echo ""
echo "📚 Next: Read docs/development/agent-tasks/P0-TASK-${AGENT_NUMBER}-*.md"
echo "🏁 Happy coding! 🚀"