import { ArticleAttributes } from '../../../lib/networking/queries/useGetArticleQuery'
import { Article } from './../../../components/templates/article/Article'
import { Box, HStack, SpanBox, VStack } from './../../elements/LayoutPrimitives'
import { StyledText } from './../../elements/StyledText'
import {
  ArticleSubtitle,
  ReaderSavedInfo,
} from './../../patterns/ArticleSubtitle'
import { theme, ThemeId } from './../../tokens/stitches.config'
import { HighlightsLayer } from '../../templates/article/HighlightsLayer'
import { Button } from '../../elements/Button'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { ReportIssuesModal } from './ReportIssuesModal'
import { reportIssueMutation } from '../../../lib/networking/mutations/reportIssueMutation'
import { updateTheme, updateThemeLocally } from '../../../lib/themeUpdater'
import { ArticleMutations } from '../../../lib/articleActions'
import { LabelChip } from '../../elements/LabelChip'
import { Label } from '../../../lib/networking/fragments/labelFragment'
import { Recommendation } from '../../../lib/networking/queries/useGetLibraryItemsQuery'
import { Avatar } from '../../elements/Avatar'
import { UserBasicData } from '../../../lib/networking/queries/useGetViewerQuery'

type ArticleContainerProps = {
  viewer: UserBasicData
  article: ArticleAttributes
  labels: Label[]
  articleMutations: ArticleMutations
  isAppleAppEmbed: boolean
  highlightBarDisabled: boolean
  margin?: number
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
  maxWidthPercentage?: number
  highContrastText?: boolean
  showHighlightsModal: boolean
  highlightOnRelease?: boolean
  justifyText?: boolean
  setShowHighlightsModal: React.Dispatch<React.SetStateAction<boolean>>
}

type RecommendationCommentsProps = {
  recommendationsWithNotes: Recommendation[]
}

const RecommendationComments = (
  props: RecommendationCommentsProps
): JSX.Element => {
  return (
    <VStack
      id="recommendations-container"
      css={{
        borderRadius: '6px',
        bg: '$grayBgSubtle',
        p: '16px',
        pt: '16px',
        pb: '2px',
        width: '100%',
        marginTop: '24px',
        color: '$grayText',
        lineHeight: '2.0',
      }}
    >
      <HStack css={{ pb: '0px', mb: '0px' }}>
        <StyledText
          style="recommendedByline"
          css={{ paddingTop: '0px', mb: '16px' }}
        >
          Comments{' '}
          <SpanBox css={{ color: 'grayText', fontWeight: '400' }}>
            &nbsp;{` ${props.recommendationsWithNotes.length}`}
          </SpanBox>
        </StyledText>
      </HStack>

      {props.recommendationsWithNotes.map((item) => (
        <VStack
          key={item.id}
          alignment="start"
          distribution="start"
          css={{ pt: '0px', pb: '8px' }}
        >
          <HStack>
            <SpanBox
              css={{
                verticalAlign: 'top',
                minWidth: '28px',
                display: 'flex',
              }}
            >
              <Avatar
                imageURL={item.user?.profileImageURL}
                height="28px"
                tooltip={item.user?.name}
                fallbackText={item.user?.username[0] ?? 'U'}
              />
            </SpanBox>
            <StyledText style="userNote" css={{ pl: '16px' }}>
              {item.note}
            </StyledText>
          </HStack>
        </VStack>
      ))}
    </VStack>
  )
}

export function ArticleContainer(props: ArticleContainerProps): JSX.Element {
  const [labels, setLabels] = useState(props.labels)
  const [title, setTitle] = useState(props.article.title)
  const [showReportIssuesModal, setShowReportIssuesModal] = useState(false)
  const [fontSize, setFontSize] = useState(props.fontSize ?? 20)
  const [highlightOnRelease, setHighlightOnRelease] = useState(
    props.highlightOnRelease
  )
  // iOS app embed can overide the original margin and line height
  const [maxWidthPercentageOverride, setMaxWidthPercentageOverride] =
    useState<number | null>(null)
  const [lineHeightOverride, setLineHeightOverride] =
    useState<number | null>(null)
  const [fontFamilyOverride, setFontFamilyOverride] =
    useState<string | null>(null)
  const [highContrastText, setHighContrastText] = useState(
    props.highContrastText ?? false
  )
  const highlightHref = useRef(
    window.location.hash ? window.location.hash.split('#')[1] : null
  )

  const updateFontSize = useCallback(
    (newFontSize: number) => {
      if (fontSize !== newFontSize) {
        setFontSize(newFontSize)
      }
    },
    [setFontSize]
  )

  useEffect(() => {
    updateFontSize(props.fontSize ?? 20)
  }, [props.fontSize])

  // Listen for preference change events sent from host apps (ios, macos...)
  useEffect(() => {
    interface UpdateLineHeightEvent extends Event {
      lineHeight?: number
    }

    const updateLineHeight = (event: UpdateLineHeightEvent) => {
      const newLineHeight = event.lineHeight ?? lineHeightOverride ?? 150
      if (newLineHeight >= 100 && newLineHeight <= 300) {
        setLineHeightOverride(newLineHeight)
      }
    }

    interface UpdateHighlightModeEvent extends Event {
      enableHighlightOnRelease?: string
    }

    const updateHighlightMode = (event: UpdateHighlightModeEvent) => {
      const isEnabled = event.enableHighlightOnRelease === 'on'
      setHighlightOnRelease(isEnabled)
    }

    interface UpdateMaxWidthPercentageEvent extends Event {
      maxWidthPercentage?: number
    }

    const updateMaxWidthPercentage = (event: UpdateMaxWidthPercentageEvent) => {
      const newMaxWidthPercentage =
        event.maxWidthPercentage ?? maxWidthPercentageOverride ?? 100
      if (newMaxWidthPercentage >= 40 && newMaxWidthPercentage <= 100) {
        setMaxWidthPercentageOverride(newMaxWidthPercentage)
      }
    }

    interface UpdateFontFamilyEvent extends Event {
      fontFamily?: string
    }

    const updateFontFamily = (event: UpdateFontFamilyEvent) => {
      const newFontFamily =
        event.fontFamily ?? fontFamilyOverride ?? props.fontFamily ?? 'inter'
      setFontFamilyOverride(newFontFamily)
    }

    interface UpdateFontContrastEvent extends Event {
      fontContrast?: 'high' | 'normal'
    }

    const handleFontContrastChange = async (event: UpdateFontContrastEvent) => {
      const highContrast = event.fontContrast == 'high'
      setHighContrastText(highContrast)
    }

    interface UpdateFontSizeEvent extends Event {
      fontSize?: number
    }

    const handleFontSizeChange = async (event: UpdateFontSizeEvent) => {
      const newFontSize = event.fontSize ?? 18
      if (newFontSize >= 10 && newFontSize <= 28) {
        updateFontSize(newFontSize)
      }
    }

    interface UpdateThemeEvent extends Event {
      themeName?: string
    }

    const handleThemeChange = async (event: UpdateThemeEvent) => {
      const newTheme = event.themeName
      if (newTheme) {
        updateTheme(newTheme)
      }
    }

    interface UpdateColorModeEvent extends Event {
      isDark?: string
    }

    const updateColorMode = (event: UpdateColorModeEvent) => {
      const isDark = event.isDark ?? 'false'
      updateThemeLocally(isDark === 'true' ? ThemeId.Dark : ThemeId.Light)
    }

    interface UpdateLabelsEvent extends Event {
      labels?: Label[]
    }

    const handleUpdateLabels = (event: UpdateLabelsEvent) => {
      setLabels(event.labels ?? [])
    }

    interface UpdateTitleEvent extends Event {
      title?: string
    }

    const handleUpdateTitle = (event: UpdateTitleEvent) => {
      if (event.title) {
        setTitle(event.title)
      }
    }

    const share = () => {
      if (navigator.share) {
        navigator.share({
          title: title,
          url: props.article.originalArticleUrl,
        })
      }
    }

    const saveReadPosition = () => {
      console.log('saving read position')
    }

    document.addEventListener('saveReadPosition', saveReadPosition)

    document.addEventListener('updateFontFamily', updateFontFamily)
    document.addEventListener('updateLineHeight', updateLineHeight)
    document.addEventListener(
      'updateMaxWidthPercentage',
      updateMaxWidthPercentage
    )
    document.addEventListener('updateTheme', handleThemeChange)
    document.addEventListener('updateFontSize', handleFontSizeChange)
    document.addEventListener('updateColorMode', updateColorMode)
    document.addEventListener(
      'handleFontContrastChange',
      handleFontContrastChange
    )
    document.addEventListener('updateTitle', handleUpdateTitle)
    document.addEventListener('updateLabels', handleUpdateLabels)

    document.addEventListener('share', share)
    document.addEventListener(
      'handleAutoHighlightModeChange',
      updateHighlightMode
    )

    return () => {
      document.removeEventListener('updateFontFamily', updateFontFamily)
      document.removeEventListener('updateLineHeight', updateLineHeight)
      document.removeEventListener(
        'updateMaxWidthPercentage',
        updateMaxWidthPercentage
      )
      document.removeEventListener('updateTheme', handleThemeChange)
      document.removeEventListener('updateFontSize', handleFontSizeChange)
      document.removeEventListener('updateColorMode', updateColorMode)
      document.removeEventListener(
        'handleFontContrastChange',
        handleFontContrastChange
      )
      document.removeEventListener('updateTitle', handleUpdateTitle)
      document.removeEventListener('updateLabels', handleUpdateLabels)
      document.removeEventListener('share', share)
      document.removeEventListener(
        'handleAutoHighlightModeChange',
        updateHighlightMode
      )
      document.removeEventListener('saveReadPosition', saveReadPosition)
    }
  })

  const styles = {
    fontSize,
    margin: props.margin ?? 360,
    maxWidthPercentage: maxWidthPercentageOverride ?? props.maxWidthPercentage,
    lineHeight: lineHeightOverride ?? props.lineHeight ?? 150,
    fontFamily: fontFamilyOverride ?? props.fontFamily ?? 'inter',
    readerFontColor: highContrastText
      ? theme.colors.readerFontHighContrast.toString()
      : theme.colors.readerFont.toString(),
    readerTableHeaderColor: theme.colors.readerTableHeader.toString(),
    readerHeadersColor: theme.colors.readerFont.toString(),
  }

  const recommendationsWithNotes = useMemo(() => {
    return (
      props.article.recommendations?.filter((recommendation) => {
        return recommendation.note
      }) ?? []
    )
  }, [props.article.recommendations])

  return (
    <>
      <Box
        id="article-container"
        css={{
          padding: '30px',
          paddingTop: '80px',
          minHeight: '100vh',
          maxWidth: `${styles.maxWidthPercentage ?? 100}%`,
          background: props.isAppleAppEmbed
            ? 'unset'
            : theme.colors.readerBg.toString(),
          '.article-inner-css': {
            textAlign: props.justifyText ? 'justify' : 'start',
          },
          '--text-font-family': styles.fontFamily,
          '--text-font-size': `${styles.fontSize}px`,
          '--line-height': `${styles.lineHeight}%`,
          '--blockquote-padding': '0.5em 1em',
          '--blockquote-icon-font-size': '1.3rem',
          '--figure-margin': '1.6rem auto',
          '--hr-margin': '1em',
          '--font-color': styles.readerFontColor,
          '--table-header-color': styles.readerTableHeaderColor,
          '@sm': {
            '--blockquote-padding': '1em 2em',
            '--blockquote-icon-font-size': '1.7rem',
            '--figure-margin': '2.6875rem auto',
            '--hr-margin': '2em',
            margin: `0px 0px`,
          },
          '@md': {
            maxWidth: styles.maxWidthPercentage
              ? `${styles.maxWidthPercentage}%`
              : 1024 - styles.margin,
          },
          '@mdDown': {
            padding: '15px',
            paddingTop: '80px',
          },
        }}
      >
        <VStack alignment="start" distribution="start">
          <ReaderSavedInfo
            rawDisplayDate={
              props.article.publishedAt ?? props.article.createdAt
            }
          />
          <StyledText
            style="articleTitle"
            data-testid="article-headline"
            css={{
              color: styles.readerFontColor,
              fontFamily: styles.fontFamily,
              width: '100%',
              wordWrap: 'break-word',
            }}
          >
            {title}
          </StyledText>
          <ArticleSubtitle
            author={props.article.author}
            href={props.article.url}
          />
          {labels ? (
            <SpanBox
              css={{
                pb: '16px',
                width: '100%',
                '&:empty': { display: 'none' },
              }}
            >
              {labels?.map((label) => (
                <LabelChip
                  key={label.id}
                  text={label.name}
                  color={label.color}
                />
              ))}
            </SpanBox>
          ) : null}
          {recommendationsWithNotes.length > 0 && (
            <RecommendationComments
              recommendationsWithNotes={recommendationsWithNotes}
            />
          )}
        </VStack>
        <Article
          articleId={props.article.id}
          content={props.article.content}
          highlightHref={highlightHref}
          initialAnchorIndex={props.article.readingProgressAnchorIndex}
          initialReadingProgressTop={props.article.readingProgressTopPercent}
          articleMutations={props.articleMutations}
        />
        <Button
          style="ghost"
          css={{
            p: 0,
            my: '$4',
            color: '$error',
            fontSize: '$1',
            '&:hover': {
              opacity: 0.8,
            },
          }}
          onClick={() => setShowReportIssuesModal(true)}
        >
          Report issues with this page -{'>'}
        </Button>
        <Box css={{ height: '100px' }} />
      </Box>
      <HighlightsLayer
        viewer={props.viewer}
        item={props.article}
        scrollToHighlight={highlightHref}
        highlights={props.article.highlights}
        articleTitle={title}
        articleAuthor={props.article.author ?? ''}
        articleId={props.article.id}
        isAppleAppEmbed={props.isAppleAppEmbed}
        highlightBarDisabled={props.highlightBarDisabled}
        showHighlightsModal={props.showHighlightsModal}
        setShowHighlightsModal={props.setShowHighlightsModal}
        highlightOnRelease={highlightOnRelease}
        articleMutations={props.articleMutations}
      />
      {showReportIssuesModal ? (
        <ReportIssuesModal
          onCommit={(comment: string) => {
            reportIssueMutation({
              pageId: props.article.id,
              itemUrl: props.article.url,
              reportTypes: ['CONTENT_DISPLAY'],
              reportComment: comment,
            })
          }}
          onOpenChange={(open: boolean) => setShowReportIssuesModal(open)}
        />
      ) : null}
    </>
  )
}
