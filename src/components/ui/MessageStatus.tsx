// Outgoing message delivery state. Read is the only accent use here (a genuine signal);
// everything else is quiet. Failed is the one place danger shows in a bubble footer.

import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import type { DeliveryStatus } from '@/types/models';

export interface MessageStatusProps {
  status: DeliveryStatus;
  size?: number;
}

export function MessageStatus({ status, size = 14 }: MessageStatusProps) {
  switch (status) {
    case 'sending':
      return <Icon icon={Clock} size={size} tone="tertiary" strokeWidth={2} />;
    case 'sent':
      return <Icon icon={Check} size={size} tone="secondary" strokeWidth={2.4} />;
    case 'delivered':
      return <Icon icon={CheckCheck} size={size} tone="secondary" strokeWidth={2.4} />;
    case 'read':
      return <Icon icon={CheckCheck} size={size} tone="accent" strokeWidth={2.4} />;
    case 'failed':
      return <Icon icon={AlertCircle} size={size} tone="danger" strokeWidth={2.2} />;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
