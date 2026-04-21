import { AiAgent } from '../agents/AiAgent/AiAgent';
import { FlowAgent } from '../agents/FlowAgent/FlowAgent';
import { MockAgent } from '../agents/MockAgent/MockAgent';
import { AgentsModule } from '../services/agents.module';

@AgentsModule({
  agents: {
    AiAgent,
    FlowAgent,
    MockAgent
  },
})
export class AppAgentsModule {}
