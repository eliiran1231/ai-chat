import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import type { DeepAgentRunState } from '../../services/deep-agent-client.service';

@Component({
  selector: 'app-agent-run-bubble',
  imports: [MarkdownComponent],
  templateUrl: './agent-run-bubble-component.html',
  styleUrl: './agent-run-bubble-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentRunBubbleComponent {
  state = input.required<DeepAgentRunState>();
  retry = output<void>();

  statusText = computed(() => {
    const state = this.state();
    if (state.status === 'failed') return state.error ?? 'The agent could not respond.';
    if (state.status === 'cancelled') return 'Response stopped.';
    if (!state.draft) return state.status === 'cancelling' ? 'Stopping...' : 'Thinking...';
    return undefined;
  });
}
