import { DeepAgent } from '../agents/DeepAgent/DeepAgent';
import { FlowAgent } from '../agents/FlowAgent/FlowAgent';
import { MockAgent } from '../agents/MockAgent/MockAgent';
import { AgentsModule } from '../services/agents.module';

@AgentsModule({
  agents: {
    DeepAgent,
    FlowAgent,
    MockAgent
  },
})
export class AppAgentsModule {}
