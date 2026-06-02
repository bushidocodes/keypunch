import { Component } from 'react';

interface IndicatorProps {
  isLit?: boolean;
  isBlinking?: boolean;
  unlitColor?: string;
  litColor?: string;
}

interface IndicatorState {
  unlitColor: string;
  litColor: string;
  isBlinking: boolean;
  blinkingInterval: ReturnType<typeof setInterval> | null;
  isLit: boolean;
}

class Indicator extends Component<IndicatorProps, IndicatorState> {
  constructor(props: IndicatorProps) {
    super(props);
    this.state = {
      unlitColor: props.unlitColor ?? '#000',
      litColor:   props.litColor   ?? '#FEFDFE',
      isBlinking: props.isBlinking ?? false,
      blinkingInterval: null,
      isLit: props.isLit ?? false,
    };
  }

  private timerID?: ReturnType<typeof setInterval>;

  componentDidMount() {
    if (this.state.isBlinking) {
      this.timerID = setInterval(() => this.toggle(), 200);
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: IndicatorProps) {
    this.setState(
      {
        isLit:      nextProps.isLit      ?? false,
        isBlinking: nextProps.isBlinking ?? false,
        unlitColor: nextProps.unlitColor ?? '#000',
        litColor:   nextProps.litColor   ?? '#FEFDFE',
      },
      () => {
        if (this.state.isBlinking && !this.state.blinkingInterval) {
          const blinkingInterval = setInterval(() => this.toggle(), 200);
          this.setState({ blinkingInterval });
        } else if (!this.state.isBlinking && this.state.blinkingInterval) {
          clearInterval(this.state.blinkingInterval);
          this.setState({ blinkingInterval: null });
        }
      }
    );
  }

  toggle() {
    this.setState({ isLit: !this.state.isLit });
  }

  render() {
    return (
      <svg viewBox="0 0 200 200" width="15px" height="15px">
        <circle
          cx="100" cy="100" r="100"
          fill={this.state.isLit ? this.state.litColor : this.state.unlitColor}
          stroke='#000'
        />
      </svg>
    );
  }
}

export default Indicator;
