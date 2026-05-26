import type { SVGProps } from 'react';

type MuiIconProps = SVGProps<SVGSVGElement> & {
  fontSize?: 'inherit' | 'small' | 'medium' | 'large' | string;
  htmlColor?: string;
  titleAccess?: string;
  sx?: Record<string, unknown>;
};

const sizeMap: Record<string, number> = {
  inherit: 20,
  small: 20,
  medium: 24,
  large: 32,
};

function makeIcon(label: string) {
  const Icon = ({ fontSize = 'medium', htmlColor, titleAccess, sx, style, ...props }: MuiIconProps) => {
    const size = sizeMap[String(fontSize)] ?? 24;
    const mergedStyle = { ...(sx as object), ...style } as SVGProps<SVGSVGElement>['style'];

    return (
      <svg
        aria-hidden={titleAccess ? undefined : true}
        aria-label={titleAccess}
        fill="none"
        focusable="false"
        height={size}
        role={titleAccess ? 'img' : undefined}
        stroke={htmlColor || 'currentColor'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        style={mergedStyle}
        viewBox="0 0 24 24"
        width={size}
        {...props}
      >
        {titleAccess ? <title>{titleAccess}</title> : null}
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    );
  };
  Icon.displayName = label;
  return Icon;
}

export const AccessTime = makeIcon('AccessTime');
export const AccountTree = makeIcon('AccountTree');
export const Add = makeIcon('Add');
export const AdminPanelSettings = makeIcon('AdminPanelSettings');
export const Air = makeIcon('Air');
export const Analytics = makeIcon('Analytics');
export const ArrowBack = makeIcon('ArrowBack');
export const ArrowDownward = makeIcon('ArrowDownward');
export const ArrowForward = makeIcon('ArrowForward');
export const ArrowUpward = makeIcon('ArrowUpward');
export const Article = makeIcon('Article');
export const AttachFile = makeIcon('AttachFile');
export const AttachMoney = makeIcon('AttachMoney');
export const AutoAwesome = makeIcon('AutoAwesome');
export const AutoFixHigh = makeIcon('AutoFixHigh');
export const Balance = makeIcon('Balance');
export const BarChart = makeIcon('BarChart');
export const Bolt = makeIcon('Bolt');
export const Build = makeIcon('Build');
export const CalendarMonth = makeIcon('CalendarMonth');
export const CallSplit = makeIcon('CallSplit');
export const CameraAlt = makeIcon('CameraAlt');
export const Cancel = makeIcon('Cancel');
export const Chat = makeIcon('Chat');
export const Check = makeIcon('Check');
export const CheckBox = makeIcon('CheckBox');
export const CheckBoxOutlineBlank = makeIcon('CheckBoxOutlineBlank');
export const CheckCircle = makeIcon('CheckCircle');
export const ChevronLeft = makeIcon('ChevronLeft');
export const ChevronRight = makeIcon('ChevronRight');
export const Circle = makeIcon('Circle');
export const Clear = makeIcon('Clear');
export const Close = makeIcon('Close');
export const Cloud = makeIcon('Cloud');
export const CloudUpload = makeIcon('CloudUpload');
export const ContentCopy = makeIcon('ContentCopy');
export const CreateNewFolder = makeIcon('CreateNewFolder');
export const Dashboard = makeIcon('Dashboard');
export const Delete = makeIcon('Delete');
export const Description = makeIcon('Description');
export const DoneAll = makeIcon('DoneAll');
export const Download = makeIcon('Download');
export const DragIndicator = makeIcon('DragIndicator');
export const DriveFileRenameOutline = makeIcon('DriveFileRenameOutline');
export const Edit = makeIcon('Edit');
export const Email = makeIcon('Email');
export const EmojiEmotions = makeIcon('EmojiEmotions');
export const EmojiEvents = makeIcon('EmojiEvents');
export const Error = makeIcon('Error');
export const Event = makeIcon('Event');
export const ExitToApp = makeIcon('ExitToApp');
export const ExpandLess = makeIcon('ExpandLess');
export const ExpandMore = makeIcon('ExpandMore');
export const Face = makeIcon('Face');
export const Favorite = makeIcon('Favorite');
export const FavoriteBorder = makeIcon('FavoriteBorder');
export const FileDownload = makeIcon('FileDownload');
export const FileUpload = makeIcon('FileUpload');
export const FilterList = makeIcon('FilterList');
export const FlashOn = makeIcon('FlashOn');
export const Folder = makeIcon('Folder');
export const Games = makeIcon('Games');
export const GetApp = makeIcon('GetApp');
export const Grain = makeIcon('Grain');
export const Group = makeIcon('Group');
export const Help = makeIcon('Help');
export const History = makeIcon('History');
export const Image = makeIcon('Image');
export const Info = makeIcon('Info');
export const Insights = makeIcon('Insights');
export const Keyboard = makeIcon('Keyboard');
export const Label = makeIcon('Label');
export const Language = makeIcon('Language');
export const Lightbulb = makeIcon('Lightbulb');
export const Link = makeIcon('Link');
export const LocalOffer = makeIcon('LocalOffer');
export const Lock = makeIcon('Lock');
export const LockOpen = makeIcon('LockOpen');
export const Mail = makeIcon('Mail');
export const Memory = makeIcon('Memory');
export const Message = makeIcon('Message');
export const Mic = makeIcon('Mic');
export const MicOff = makeIcon('MicOff');
export const MoreVert = makeIcon('MoreVert');
export const Note = makeIcon('Note');
export const OpenInNew = makeIcon('OpenInNew');
export const Pattern = makeIcon('Pattern');
export const Pause = makeIcon('Pause');
export const People = makeIcon('People');
export const Person = makeIcon('Person');
export const PlayArrow = makeIcon('PlayArrow');
export const PlayCircle = makeIcon('PlayCircle');
export const Preview = makeIcon('Preview');
export const Psychology = makeIcon('Psychology');
export const Public = makeIcon('Public');
export const PushPin = makeIcon('PushPin');
export const QrCode = makeIcon('QrCode');
export const QuestionAnswer = makeIcon('QuestionAnswer');
export const Quiz = makeIcon('Quiz');
export const RadioButtonUnchecked = makeIcon('RadioButtonUnchecked');
export const Refresh = makeIcon('Refresh');
export const Remove = makeIcon('Remove');
export const Replay = makeIcon('Replay');
export const Reply = makeIcon('Reply');
export const Save = makeIcon('Save');
export const Schedule = makeIcon('Schedule');
export const Search = makeIcon('Search');
export const Send = makeIcon('Send');
export const Settings = makeIcon('Settings');
export const Share = makeIcon('Share');
export const ShoppingCart = makeIcon('ShoppingCart');
export const ShowChart = makeIcon('ShowChart');
export const SkipNext = makeIcon('SkipNext');
export const SmartToy = makeIcon('SmartToy');
export const Speed = makeIcon('Speed');
export const Spellcheck = makeIcon('Spellcheck');
export const Star = makeIcon('Star');
export const StarBorder = makeIcon('StarBorder');
export const Stop = makeIcon('Stop');
export const Summarize = makeIcon('Summarize');
export const SwapHoriz = makeIcon('SwapHoriz');
export const SwapVert = makeIcon('SwapVert');
export const TaskAlt = makeIcon('TaskAlt');
export const Timeline = makeIcon('Timeline');
export const TouchApp = makeIcon('TouchApp');
export const TrendingDown = makeIcon('TrendingDown');
export const TrendingFlat = makeIcon('TrendingFlat');
export const TrendingUp = makeIcon('TrendingUp');
export const Update = makeIcon('Update');
export const Upload = makeIcon('Upload');
export const Visibility = makeIcon('Visibility');
export const VisibilityOff = makeIcon('VisibilityOff');
export const VolumeOff = makeIcon('VolumeOff');
export const VolumeUp = makeIcon('VolumeUp');
export const Warning = makeIcon('Warning');
export const WaterDrop = makeIcon('WaterDrop');
export const WbSunny = makeIcon('WbSunny');
export const ZoomIn = makeIcon('ZoomIn');

export default makeIcon('MuiIcon');
