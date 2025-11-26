import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const CompSecSchema = new Schema ({
    questionName: String,
    correctBoolean: Boolean,
    responseTimeMs: Number,
    domain: {
        type: String,
        default: 'CompSec'
    }


},

{
    timestamps: true
});

const CompSec = model('CompSec', CompSecSchema);
export default CompSec;