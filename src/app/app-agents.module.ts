import { AiAgent } from '../agents/AiAgent';
import { FlowAgent } from '../agents/FlowAgent';
import { MockAgent } from '../agents/MockAgent';
import { AgentsModule } from '../services/agents.module';

@AgentsModule({
  agents: {
    AiAgent,
    FlowAgent,
    MockAgent
  },
})
export class AppAgentsModule {}
