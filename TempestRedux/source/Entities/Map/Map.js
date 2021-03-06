var SpecialPoints = {
    BoundStart:1, // A point you can't move past or move onto
    BoundEnd:2

}

var Map = /** @class */ (function (){

    

    // TODO Strange issue occuring where this might be getting called upon ending level and switching to UI
    function Map(points)
    {
        this.MapStates = 
        {
            Default:0,
            Starting:1,
            Ending:2,
            None:3
        }
        this.CurrentMapState = this.MapStates.Default;
        this.ZoomInScale = 0.01;
        this.ZoomOutScale = 80;
        this.CurrentScaleModifier = this.ZoomInScale;
        this.ScaleSpeedIn = 0.8;
        this.ScaleSpeedOut = 50;
        this.LoadCompleteCallback = null;
        this.UnloadCompleteCallback = null;
        
        // Set scale values and colors
        this.InnerScale = 0.075;
        this.TotalScale = 2.5;
        this.BaseLineColor = 0x1fd2a2;
        this.FlipLineColor = 0xedc81f;
        this.LineWidth = 2;

        //audio
        this.TransitionSound = TempestGame.getInstance().GetCurrentScene().sound.add('transition_sfx');

        // For modifying scale on fly
        this.GetCurrentScale = function()
        {
            return this.CurrentScaleModifier;
        }

        // Store ExPoints
        this.ExPoints = [];
        for(var i = 0; i < points.length; i++)
        {
            if(points[i] == SpecialPoints.BoundStart)
                this.ExPoints.push(SpecialPoints.BoundStart);
            else if (points[i] == SpecialPoints.BoundEnd)
                this.ExPoints.push(SpecialPoints.BoundEnd);
            else
                this.ExPoints.push(new Vector2(points[i].x,points[i].y));
        }

        if(this.ExPoints.length <= 1)
            return;

        // Total scale for making a level bigger
        for(var i = 0; i < this.ExPoints.length; i++)
        {
            if(this.ExPoints[i] == SpecialPoints.BoundStart || this.ExPoints[i] == SpecialPoints.BoundEnd)
            {

            }
            else
            {
                this.ExPoints[i].x *= this.TotalScale; 
                this.ExPoints[i].y *= this.TotalScale; 
            }
        }
        
        // Set InPoints
        // Scale of inner relative to total scale
        this.InPoints = [];
        for(var i = 0; i < this.ExPoints.length; i++)
        {
            if(this.ExPoints[i] == SpecialPoints.BoundStart)
                this.InPoints.push(SpecialPoints.BoundStart);
            else if(this.ExPoints[i] == SpecialPoints.BoundEnd)
                this.InPoints.push(SpecialPoints.BoundEnd);
            else
            {
                this.InPoints.push(
                    new Vector2
                    (this.ExPoints[i].x * this.InnerScale,
                         this.ExPoints[i].y * this.InnerScale))
            }
        }

        this.GetNextPositiveIndex = function(index)
        {
            var nextIndex = index + 1;

            if(nextIndex >= this.ExPoints.length)
                nextIndex = 0;

            return nextIndex;
        }

        this.GetNextNegativeIndex = function(index)
        {
            var nextIndex = index -  1 ;

            if(nextIndex < 0)
                nextIndex = this.ExPoints.length - 1;

            return nextIndex;
        }
    }

    Map.prototype.Update = function(deltaTime){

        if(this.CurrentMapState == this.MapStates.Starting)
        {
            this.CurrentScaleModifier += (this.ScaleSpeedIn * deltaTime)
            this.DrawMap();
            if(this.CurrentScaleModifier > 1)
            {
                this.CurrentScaleModifier = 1;
                this.CurrentMapState = this.MapStates.Default;
                this.LoadCompleteCallback();
            }
        }
        else if(this.CurrentMapState == this.MapStates.Ending)
        {
            this.CurrentScaleModifier += (this.ScaleSpeedOut * deltaTime)
            this.DrawMap();
            if(this.CurrentScaleModifier > this.ZoomOutScale)
            {
                this.CurrentScaleModifier = this.ZoomOutScale;
                this.UnloadCompleteCallback();
            }
        }
        else
        {
            
        }
    }

    Map.prototype.Draw = function(graphics){
    }

    Map.prototype.DrawMap = function()
    {
        var graphics = TempestGame.getInstance().GetGraphics()
        graphics.clear();

        if(this.ExPoints.length <= 1)
            return;

        // For drawing map stuff relevant to player
        var currentPlayer = LevelManager.getInstance().GetCurrentLevel().GetPlayer();
        var playerIndex = (currentPlayer) ? currentPlayer.GetPIndex() : null;
        var playerFlipIndex = this.GetFlipIndex(playerIndex);

        // Scales
        var currentScale = this.GetCurrentScale();


        // Draw Outside ExPoints
        for(var i = 0; i < this.ExPoints.length; i++)
        {
            var nextPoint;
            if(i >= (this.ExPoints.length - 1))
            {
                nextPoint = this.ExPoints[0];
            }
            else
            {
                nextPoint = this.ExPoints[i+1];
            }

            // Draw lines
            if(playerFlipIndex >= 0  && i == playerFlipIndex)
                graphics.lineStyle(this.LineWidth, this.FlipLineColor, 1);
            else
                graphics.lineStyle(this.LineWidth, this.BaseLineColor, 1)

            // Skip drawing boundary
            if(this.ExPoints[i] == SpecialPoints.BoundEnd && nextPoint == SpecialPoints.BoundStart)
                continue;

            graphics.lineBetween(this.ExPoints[i].x * currentScale,this.ExPoints[i].y * currentScale,nextPoint.x * currentScale,nextPoint.y * currentScale);         
        }

        //Draw Inside
        for(var i = 0; i < this.InPoints.length; i++)
        {
            var nextPoint;
            if(i >= (this.InPoints.length - 1))
            {
                nextPoint = this.InPoints[0];
            }
            else
            {
                nextPoint = this.InPoints[i+1];
            }

            // Draw lines
            if(playerFlipIndex >= 0 && i == playerFlipIndex)
                graphics.lineStyle(this.LineWidth, this.FlipLineColor, 1);
            else
                graphics.lineStyle(this.LineWidth, this.BaseLineColor, 1)

            // Skip drawing bound points
            if(this.InPoints[i] == SpecialPoints.BoundEnd && nextPoint == SpecialPoints.BoundStart)
                continue;

            graphics.lineBetween(this.InPoints[i].x * currentScale,this.InPoints[i].y * currentScale,nextPoint.x * currentScale,nextPoint.y * currentScale);
        }

        // // Draw Pathing Lines
        for(var i = 0; i < this.ExPoints.length; i++)
        {
            // Define color
            var nextIndex =  ((this.ExPoints.length - 1 ) == playerFlipIndex)? 0 : playerFlipIndex + 1;
            if(playerFlipIndex >= 0 && (i == playerFlipIndex  || i == nextIndex))
                graphics.lineStyle(this.LineWidth, this.FlipLineColor, 1);
            else
                graphics.lineStyle(this.LineWidth, this.BaseLineColor, 1)

           
            graphics.lineBetween(this.ExPoints[i].x * currentScale,this.ExPoints[i].y * currentScale, this.InPoints[i].x * currentScale, this.InPoints[i].y * currentScale);
        }
    }

    Map.prototype.BeginLoadMap = function( callback)
    {
        this.LoadCompleteCallback = callback;
        this.CurrentMapState = this.MapStates.Starting;
    }

    Map.prototype.BeginUnloadMap = function (callback)
    {
        //transition sfx
        this.TransitionSound.play();

        this.UnloadCompleteCallback = callback;
        this.CurrentMapState = this.MapStates.Ending;
    }

    Map.prototype.GetNextIndexPositive = function(index){
        var nextIndex = this.GetNextPositiveIndex(index);

        // Bounds Check
        if(this.ExPoints[nextIndex + 1] == SpecialPoints.BoundStart)
            return index;

        return nextIndex;
    }

    Map.prototype.GetNextIndexNegative = function(index){
        var nextIndex = this.GetNextNegativeIndex(index);
            
        // Bounds Check
        if(this.ExPoints[nextIndex] == SpecialPoints.BoundEnd)
            return index;

        return nextIndex;
    }

    Map.prototype.GetFlipIndex = function(index){
        if(index < 0)
            return null;
        var divisor = (index + (this.ExPoints.length/2));
        var nextIndex = divisor % this.ExPoints.length;

        // Bounds Check
        if(this.ExPoints[nextIndex] == SpecialPoints.BoundEnd)
            return index;

        return nextIndex;
    }

    Map.prototype.GetCenter = function(){
        return new Vector2(0,0);
    }

    Map.prototype.GetRandomIndex = function(){
        // Make sure spawn is not a boundary
        while(true)
        {
            var index = Math.floor(Math.random() * this.ExPoints.length);
            if(this.ExPoints[index] != SpecialPoints.BoundStart && this.ExPoints[index] != SpecialPoints.BoundEnd &&
                this.ExPoints[index+1] != SpecialPoints.BoundStart)
                return index;
        }
    }

    Map.prototype.GetEdgeVectorPosition  = function(index){
        
        // Caluclates player positions always to the right of the index in the ExPoints
        var nextIndex = index + 1;
        if(nextIndex >= this.ExPoints.length)
            nextIndex = 0;

        var offset = new Vector2((this.ExPoints[nextIndex].x - this.ExPoints[index].x)* 0.5, (this.ExPoints[nextIndex].y - this.ExPoints[index].y)* 0.5)
        return new Vector2(this.ExPoints[index].x + offset.x, this.ExPoints[index].y + offset.y);
    }

    

    Map.prototype.AttemptToWipeAss = function(){
        this.ExPoints = null;
        this.InPoints = null;
    }
    return Map;
}())
