import React, { useEffect, useState } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import { connect } from 'react-redux';
import jesFtp, { listDatasets } from '../utils/jesFtp';

// Minimal custom collapsible tree (replaces react-treebeard, which is
// unmaintained and React-18-incompatible). It preserves the data shape produced
// by parseDatasets/parseMembers: an array of dataset nodes, each with a
// `.children` array of member nodes. Datasets toggle open/closed; clicking a
// member (a leaf node, no `children`) retrieves it into the editor.
function DatasetTree({ datasets, onSelectMember }) {
  // Track which dataset names are expanded.
  const [expanded, setExpanded] = useState({});

  const toggle = (name) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  const nodes = Array.isArray(datasets) ? datasets : [];

  return (
    <ul className="tree">
      {nodes.map((dataset) => {
        const isOpen = !!expanded[dataset.name];
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

function Explorer(props) {
  // Old react-router v3 `onEnter={listDatasets}` -> run once on mount.
  useEffect(() => {
    listDatasets();
  }, []);

  const onSelectMember = (member) => {
    // Members are leaf nodes (no `children`); retrieve into the editor pane.
    jesFtp.retrieveMember(member.attributes.dsname, member.name);
  };

  return (
    <div className="explorer">
      <div className="explorer-tree">
        <DatasetTree datasets={props.datasets} onSelectMember={onSelectMember} />
      </div>
      <div className="explorer-editor">
        <AceEditor
          mode="java"
          theme={props.theme === 'dark' ? 'twilight' : 'github'}
          name="EXPLORER" // TODO: Change this to a generated value when we add multiple editors
          readOnly
          editorProps={{
            $blockScrolling: Infinity,
            readOnly: true
          }}
          value={props.explorerContent}
          width="100%"
          height="100%"
          fontSize={20}
        />
      </div>
    </div>
  );
}

function mapStateToProps(state) {
  return {
    datasets: state.datasets,
    theme: state.uiStyle.theme,
    color: state.uiStyle.color,
    explorerContent: state.explorer.explorerContent
  };
}

export default connect(mapStateToProps)(Explorer);
