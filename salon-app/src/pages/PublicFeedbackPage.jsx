import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Loader2, AlertCircle, Scissors, Calendar, User, MessageSquare } from 'lucide-react';

const API = '/api/public';

export default function PublicFeedbackPage() {
  const { appointmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/feedback/${appointmentId}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Invalid link');
        }
        const d = await res.json();
        setData(d);
        if (d.alreadyReviewed) {
          setRating(d.existingFeedback.rating);
          setComment(d.existingFeedback.comment || '');
          setSubmitted(true);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, rating, comment: comment.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  const ratingColors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">Your feedback helps us improve our services</p>

          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`w-8 h-8 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>
          <p className={`text-lg font-semibold ${ratingColors[rating]}`}>{ratingLabels[rating]}</p>

          {comment && (
            <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 italic">
              "{comment}"
            </div>
          )}

          <p className="text-xs text-gray-400 mt-6">— {data?.salonName || 'Our Salon'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-amber-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg">O</div>
          <div>
            <h1 className="font-bold text-gray-900">{data?.salonName || 'Our Salon'}</h1>
            <p className="text-xs text-gray-500">We'd love your feedback</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Hi {data?.customerName}!</h2>
          <p className="text-sm text-gray-500">How was your recent visit?</p>
        </div>

        {/* Appointment details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-2">
          {data?.services?.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Scissors className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-gray-700">{data.services.join(', ')}</span>
            </div>
          )}
          {data?.stylistName && (
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-gray-700">{data.stylistName}</span>
            </div>
          )}
          {data?.date && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-gray-700">{new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          )}
        </div>

        {/* Star Rating */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 text-center">
          <p className="text-sm font-medium text-gray-700 mb-4">Rate your experience</p>
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onMouseEnter={() => setHoveredStar(i)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(i)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    i <= (hoveredStar || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 hover:text-amber-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {(hoveredStar || rating) > 0 && (
            <p className={`text-sm font-semibold transition-colors ${ratingColors[hoveredStar || rating]}`}>
              {ratingLabels[hoveredStar || rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        {rating > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              Tell us more (optional)
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={rating >= 4 ? "What did you love about your visit?" : "How can we improve?"}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
            rating
              ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
            </span>
          ) : (
            'Submit Feedback'
          )}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Your feedback is confidential and helps us serve you better
        </p>
      </div>
    </div>
  );
}
