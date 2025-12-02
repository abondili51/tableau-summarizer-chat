# TODO - Future Enhancements

## Visual Context with Sheet Images

Add sheet image capture to send visual context to Gemini along with data.

**Benefits:**
- Better understanding of chart types and visual patterns
- More accurate insights matching what users see
- Gemini 1.5 Pro supports multimodal (text + images)

**Implementation:**
1. Add `captureSheetImage()` function in `TableauConnector.js`
2. Use `worksheet.captureAsync()` to get base64 images
3. Include images in payload sent to backend
4. Update backend to use Gemini multimodal API
5. Add toggle in UI to enable/disable image capture

**Considerations:**
- Larger payload size (images add ~50-200KB per sheet)
- Slightly slower processing
- May need to compress/resize images
- Test impact on API costs

**Files to modify:**
- `frontend/src/services/TableauConnector.js`
- `frontend/src/App.jsx`
- `backend/app.py`
- `backend/prompts.py`

---

## Other Future Ideas

- [ ] Cache summaries to avoid regenerating for same data
- [ ] Export summary as PDF/Word document
- [ ] Scheduled summaries (email digest)
- [ ] Custom prompt templates for different use cases
- [ ] Support for multiple LLM providers (OpenAI, Claude, etc.)
- [ ] Comparison mode (compare two time periods)

