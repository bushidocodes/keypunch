import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import { connect } from 'react-redux';
import { setEditorContent } from '../actions/editor';
import type { RootState } from '../reducers';
import type { AppDispatch } from '../store/configureStore';

function mapStateToProps(state: RootState) {
  return {
    editorContent: state.editor.editorContent,
    theme:         state.uiStyle.theme,
    color:         state.uiStyle.color,
  };
}

function mapDispatchToProps(dispatch: AppDispatch) {
  return {
    setEditorContent: (newValue: string) => dispatch(setEditorContent(newValue)),
  };
}

type Props = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

function Editor(props: Props) {
  return (
    <AceEditor
      mode="java"
      theme={props.theme === 'dark' ? 'twilight' : 'github'}
      onChange={props.setEditorContent}
      name="EDITOR" // TODO: Change this to a generated value when we add multiple editors
      editorProps={{ $blockScrolling: Infinity }}
      value={props.editorContent}
      width="100%"
      height="100%"
      fontSize={20}
    />
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
