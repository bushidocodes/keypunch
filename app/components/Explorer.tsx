import { useEffect, useState } from 'react';
import AceEditor from '../utils/react-ace';
import 'ace-builds/src-noconflict/mode-cobol';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import { connect } from 'react-redux';
import jesFtp, { listDatasets } from '../utils/jesFtp';
import type { Dataset, Member } from '../utils/jesParse';
import type { RootState } from '../reducers';

// Minimal custom collapsible tree (replaces react-treebeard, which is
// unmaintained and React-18-incompatible). It preserves the data shape produced
// by parseDatasets/parseMembers: an array of dataset nodes, each with a
// `.children` array of member nodes. Datasets toggle open/closed; clicking a
// member (a leaf node, no `children`) retrieves it into the editor.
interface DatasetTreeProps {
  datasets: Dataset[];
  onSelectMember: (member: Member) => void;
}

// Exported as a named export so it can be unit-tested in isolation (see
// harness/component/DatasetTree.test.jsx). The default export is the full
// Redux-connected Explorer panel.
export function DatasetTree({ datasets, onSelectMember }: DatasetTreeProps) {
  // Track which dataset names are expanded.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  const nodes = Array.isArray(datasets) ? datasets : [];

  return (
    <ul className="tree">
      {nodes.map((dataset) => {
        const isOpen  = !!expanded[dataset.name];
        const members = dataset.children || [];
        return (
          <li key={dataset.name} className="tree-dataset">
            <div
              className="tree-node tree-node-dataset"
              onClick={() => toggle(dataset.name)}
            >
              <span className="tree-toggle">{isOpen ? '▾' : '▸'}</span>
              <span className="tree-label">{dataset.name}</span>
            </div>
            {isOpen && (
              <ul className="tree-members">
                {members.map((member) => (
                  <li key={member.name}>
                    <div
                      className="tree-node tree-node-member"
                      onClick={() => onSelectMember(member)}
                    >
                      <span className="tree-label">{member.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function mapStateToProps(state: RootState) {
  return {
    datasets:        state.datasets,
    theme:           state.uiStyle.theme,
    explorerContent: state.explorer.explorerContent,
  };
}

type Props = ReturnType<typeof mapStateToProps>;

function Explorer(props: Props) {
  // Old react-router v3 `onEnter={listDatasets}` -> run once on mount.
  useEffect(() => {
    listDatasets();
  }, []);

  const onSelectMember = (member: Member) => {
    // Members are leaf nodes; retrieve into the editor pane.
    jesFtp.retrieveMember(member.attributes.dsname, member.name);
  };

  return (
    <div className="explorer">
      <div className="explorer-tree">
        <DatasetTree datasets={props.datasets} onSelectMember={onSelectMember} />
      </div>
      <div className="explorer-editor">
        <AceEditor
          mode="cobol"
          theme={props.theme === 'dark' ? 'twilight' : 'github'}
          name="EXPLORER" // TODO: Change this to a generated value when we add multiple editors
          readOnly
          editorProps={{ readOnly: true }}
          value={props.explorerContent}
          width="100%"
          height="100%"
          fontSize={20}
        />
      </div>
    </div>
  );
}

export default connect(mapStateToProps)(Explorer);
