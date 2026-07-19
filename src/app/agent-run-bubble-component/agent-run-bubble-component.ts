import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-agent-run-bubble',
  templateUrl: './agent-run-bubble-component.html',
  styleUrl: './agent-run-bubble-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentRunBubbleComponent {
  actions = input.required<string[]>();
}
