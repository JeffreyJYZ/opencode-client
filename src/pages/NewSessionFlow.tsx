import type { CSSProperties } from "react";
import { CANCEL_LABEL, CREATE_SESSION_LABEL, DIRECTORY_INPUT_LABEL } from "@/constants/directories";
import type { DirectoryPicker } from "@/native/pickDirectory";
import { useNewSessionFlow } from "@/session/useNewSessionFlow";

const STYLE: CSSProperties = {
	position: "fixed",
	inset: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	background: "rgba(0, 0, 0, 0.5)",
	zIndex: 50,
};

export type NewSessionFlowProps = {
	readonly picker?: DirectoryPicker;
	readonly pickerAvailable?: boolean;
};

export function NewSessionFlow({ picker, pickerAvailable }: NewSessionFlowProps) {
	const flow = useNewSessionFlow({ picker, pickerAvailable });
	if (!flow.open) return null;
	return (
		<div style={STYLE} role="dialog" aria-label="New session">
			<div
				style={{
					background: "var(--oc-surface)",
					padding: "var(--oc-space-4)",
					borderRadius: "var(--oc-radius)",
				}}
			>
				{flow.error !== null && (
					<p style={{ color: "var(--oc-danger, red)" }}>{flow.error}</p>
				)}
				<div style={{ display: "flex", gap: "var(--oc-space-2)", flexWrap: "wrap" }}>
					{flow.recents.map((dir) => (
						<button type="button" key={dir} onClick={() => void flow.pickChip(dir)}>
							{dir}
						</button>
					))}
				</div>
				<label>
					{DIRECTORY_INPUT_LABEL}
					<input
						aria-label={DIRECTORY_INPUT_LABEL}
						value={flow.path}
						onChange={(e) => flow.setPath(e.target.value)}
					/>
				</label>
				<div
					style={{
						display: "flex",
						gap: "var(--oc-space-2)",
						marginTop: "var(--oc-space-2)",
					}}
				>
					<button type="button" disabled={flow.busy} onClick={() => void flow.submit()}>
						{CREATE_SESSION_LABEL}
					</button>
					<button type="button" onClick={flow.cancel}>
						{CANCEL_LABEL}
					</button>
				</div>
			</div>
		</div>
	);
}

export default NewSessionFlow;
