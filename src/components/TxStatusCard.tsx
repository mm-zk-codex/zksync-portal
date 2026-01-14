import { StoredTx } from "../storage/txStore";
import { getTokenLogo } from "../utils/assets";
import { formatActivityTime } from "../utils/time";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { LogoBadge } from "./LogoBadge";

export const TxStatusCard = ({ tx }: { tx: StoredTx }) => {
  const timeLabel = formatActivityTime(tx.updatedAt || tx.createdAt);
  return (
    <div className="card activity-card">
      <div className="flex space-between">
        <div>
          <strong>{tx.type.toUpperCase()}</strong>
          <div className="small muted">{timeLabel}</div>
        </div>
        <span className="badge">{tx.status}</span>
      </div>
      <div className="activity-row">
        <LogoBadge label={tx.token} src={getTokenLogo(tx.token)} size={28} shape="circle" />
        <div>
          <div className="small muted">Token</div>
          <div>{tx.token}</div>
        </div>
        <div>
          <div className="small muted">Amount</div>
          <div>{tx.amount}</div>
        </div>
        {tx.explorerUrl ? <ExternalLinkButton href={tx.explorerUrl} label="View on explorer" /> : null}
      </div>
      <div className="small muted">Tx hash:</div>
      <div className="code small">{tx.txHash}</div>
    </div>
  );
};
