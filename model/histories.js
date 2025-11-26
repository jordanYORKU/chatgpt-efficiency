import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const HistorySchema = new Schema ({
    questionName: String,
    correctBoolean: Boolean,
    responseTimeMs: Number,

    domain: {
        type: String,
        default: 'History'
    }
},

{
    timestamps: true
});

const History = model('History', HistorySchema);
export default History;